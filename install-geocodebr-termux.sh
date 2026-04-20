#!/usr/bin/env bash
# ViaX:Trace — GeocodeR BR para Termux (Android)
# Instala R via proot-distro (Ubuntu) e configura o microserviço geocodebr.
# Uso: bash install-geocodebr-termux.sh

# ---------------------------------------------------------------------------
# Cores e helpers
# ---------------------------------------------------------------------------
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
ok()   { echo -e "${G}[ok]${N} $*"; }
inf()  { echo -e "${C}[..] $*${N}"; }
warn() { echo -e "${Y}[av] $*${N}"; }
die()  { echo -e "${R}[erro]${N} $*" >&2; exit 1; }
step() { echo -e "\n${B}${C}==> $*${N}"; }

echo -e "\n${B}${C}ViaX:Trace — GeocodeR BR${N}  (proot-distro + Ubuntu + R)\n"
echo -e "${Y}Espaço necessário: ~3.5 GB livres   Tempo estimado: 20-60 min${N}\n"

# ---------------------------------------------------------------------------
# Detecta diretório da app
# ---------------------------------------------------------------------------
if [[ -d "$HOME/viax-system" ]]; then
  APP="$HOME/viax-system"
elif [[ -f "$(pwd)/package.json" ]]; then
  APP="$(pwd)"
else
  APP="$(cd "$(dirname "$0")" && pwd)"
fi
PLUMBER="$APP/artifacts/geocodebr-service/plumber.R"
START_R="$APP/artifacts/geocodebr-service/start.R"
UBUNTU_ROOT="${PREFIX}/var/lib/proot-distro/installed-rootfs/ubuntu"
UBUNTU_WORK="$UBUNTU_ROOT/root/viax-geocodebr"

# ---------------------------------------------------------------------------
# PASSO 1 — proot-distro
# ---------------------------------------------------------------------------
step "Instalando proot-distro..."
if ! command -v proot-distro &>/dev/null; then
  pkg install -y proot-distro || die "Falha ao instalar proot-distro"
fi
ok "proot-distro disponível"

# ---------------------------------------------------------------------------
# PASSO 2 — Ubuntu via proot-distro
# ---------------------------------------------------------------------------
step "Configurando Ubuntu no proot-distro..."
if [[ ! -d "$UBUNTU_ROOT" ]]; then
  inf "Instalando Ubuntu (primeira vez — pode demorar alguns minutos)..."
  proot-distro install ubuntu || die "Falha ao instalar Ubuntu"
fi
proot-distro login ubuntu -- true 2>/dev/null \
  || die "Ubuntu inacessível. Tente: proot-distro reset ubuntu"
ok "Ubuntu pronto"

# ---------------------------------------------------------------------------
# Função auxiliar: executar comando dentro do Ubuntu
# ---------------------------------------------------------------------------
ubuntu() { proot-distro login ubuntu -- bash -c "$1"; }

# ---------------------------------------------------------------------------
# PASSO 3 — Detectar versão do Ubuntu e configurar repositórios
# ---------------------------------------------------------------------------
step "Detectando versão do Ubuntu..."
UBUNTU_CODENAME=$(ubuntu "lsb_release -cs 2>/dev/null || . /etc/os-release && echo \$VERSION_CODENAME" 2>/dev/null | tr -d '[:space:]')
[[ -z "$UBUNTU_CODENAME" ]] && UBUNTU_CODENAME="noble"
inf "Ubuntu detectado: ${UBUNTU_CODENAME}"

# Monta a URL do PPM binário para a versão correta
# PPM tem binários para noble (24.04); para versões mais novas usa noble como fallback
PPM_CODENAME="$UBUNTU_CODENAME"
case "$UBUNTU_CODENAME" in
  focal|jammy|noble) ;;
  *) warn "Ubuntu '${UBUNTU_CODENAME}' sem binários PPM — usando noble como fallback"; PPM_CODENAME="noble" ;;
esac
PPM_URL="https://packagemanager.posit.co/cran/__linux__/${PPM_CODENAME}/latest"
inf "PPM: ${PPM_URL}"
ok "Repositórios configurados"

# ---------------------------------------------------------------------------
# PASSO 4 — Atualiza apt e instala dependências de sistema
# ---------------------------------------------------------------------------
step "Atualizando apt e instalando dependências de sistema..."
ubuntu "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq 2>&1 | tail -1
  apt-get install -y --no-install-recommends \
    r-base r-base-dev \
    libcurl4-openssl-dev libssl-dev libxml2-dev \
    libgdal-dev libgeos-dev libproj-dev libudunits2-dev \
    libuv1-dev \
    libfontconfig1-dev libfreetype-dev \
    libharfbuzz-dev libfribidi-dev \
    libpng-dev libjpeg-dev libtiff5-dev \
    build-essential ca-certificates git \
    pkg-config 2>&1 | grep -E '(Err|error|NEW|upgraded|not upgraded|Done)' || true
" || die "Falha ao instalar dependências de sistema"
ok "Dependências de sistema instaladas"

# ---------------------------------------------------------------------------
# PASSO 5 — Instala pacotes R via apt (binários pré-compilados, sem compilação)
# ---------------------------------------------------------------------------
step "Instalando pacotes R via apt (rápido, sem compilação)..."
ubuntu "
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y --no-install-recommends \
    r-cran-jsonlite r-cran-httr r-cran-curl r-cran-openssl \
    r-cran-xml2 r-cran-stringi r-cran-stringr \
    r-cran-dplyr r-cran-tidyr r-cran-rlang r-cran-cli \
    r-cran-glue r-cran-lifecycle r-cran-vctrs r-cran-pillar \
    r-cran-r6 r-cran-tibble r-cran-purrr r-cran-magrittr \
    r-cran-sf r-cran-units r-cran-s2 r-cran-wk \
    r-cran-future r-cran-promises r-cran-later r-cran-fastmap \
    r-cran-mime r-cran-rcpp r-cran-digest \
    r-cran-generics r-cran-tidyselect r-cran-utf8 r-cran-fansi \
    r-cran-withr r-cran-parallelly r-cran-globals r-cran-listenv \
    2>&1 | grep -E '(Err|error|NEW|upgraded|not upgraded|Done)' || true
" || warn "Alguns pacotes apt podem não ter sido instalados — continuando..."
ok "Pacotes apt instalados"

# ---------------------------------------------------------------------------
# PASSO 6 — Escreve script R no Ubuntu e instala plumber + geocodebr
# ---------------------------------------------------------------------------
step "Instalando plumber e geocodebr via CRAN..."

# Cria o diretório de trabalho no Ubuntu e escreve o script R em um arquivo
ubuntu "mkdir -p /root/viax-geocodebr"

cat > "$UBUNTU_ROOT/root/viax-geocodebr/_install_pkgs.R" << RSCRIPT
# Configura repositórios (PPM binários + CRAN fallback)
options(
  repos = c(
    PPM  = "${PPM_URL}",
    CRAN = "https://cloud.r-project.org"
  ),
  Ncpus        = max(1L, parallel::detectCores() - 1L),
  timeout      = 300
)

# Limpa locks órfãos que possam ter sobrado de instalações anteriores
lib <- .libPaths()[1]
locks <- list.files(lib, pattern = "^00LOCK-", full.names = TRUE)
if (length(locks) > 0) {
  message("Removendo ", length(locks), " lock(s) órfão(s)...")
  unlink(locks, recursive = TRUE)
}

# Instala apenas Depends + Imports + LinkingTo (sem Suggests pesados)
safe_install <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    message("\n[instalando] ", pkg, " ...")
    tryCatch(
      install.packages(pkg, dependencies = c("Depends", "Imports", "LinkingTo")),
      error = function(e) message("[aviso] Falha em '", pkg, "': ", conditionMessage(e))
    )
  } else {
    message("[ok] ", pkg, " ja instalado")
  }
}

# Pacotes necessários em ordem de dependência
pkgs <- c(
  "webutils",
  "httpuv",
  "plumber",
  "geocodebr"
)

for (pkg in pkgs) safe_install(pkg)

# Verifica resultado final
ok  <- pkgs[sapply(pkgs, requireNamespace, quietly = TRUE)]
nok <- pkgs[!sapply(pkgs, requireNamespace, quietly = TRUE)]

cat("\n--- Resultado ---\n")
if (length(ok))  cat("[ok]    ", paste(ok,  collapse = ", "), "\n")
if (length(nok)) cat("[FALHA] ", paste(nok, collapse = ", "), "\n")

if ("plumber" %in% nok || "geocodebr" %in% nok) {
  quit(status = 1)
} else {
  cat("\nPacotes essenciais prontos!\n")
}
RSCRIPT

ubuntu "Rscript /root/viax-geocodebr/_install_pkgs.R" \
  || warn "Alguns pacotes R podem não ter sido instalados (veja saída acima)"
ok "Etapa de pacotes R concluída"

# ---------------------------------------------------------------------------
# PASSO 7 — Copia arquivos do microserviço para o Ubuntu
# ---------------------------------------------------------------------------
step "Copiando arquivos do microserviço para o Ubuntu..."
mkdir -p "$UBUNTU_WORK"
if [[ -f "$PLUMBER" ]]; then
  cp "$PLUMBER" "$UBUNTU_WORK/"
  ok "plumber.R copiado"
else
  warn "plumber.R não encontrado em $PLUMBER — copie manualmente para $UBUNTU_WORK/"
fi
if [[ -f "$START_R" ]]; then
  cp "$START_R" "$UBUNTU_WORK/"
  ok "start.R copiado"
fi

# ---------------------------------------------------------------------------
# PASSO 8 — Cria script de inicialização
# ---------------------------------------------------------------------------
step "Criando start-geocodebr.sh..."
cat > "$APP/start-geocodebr.sh" << 'STARTSCRIPT'
#!/usr/bin/env bash
# ViaX:Trace — Inicia o microserviço GeocodeR BR (Ubuntu via proot-distro)
PORT="${GEOCODEBR_PORT:-8002}"

echo ""
echo "  GeocodeR BR — porta $PORT"
echo "  Aguarde 'Listening on 0.0.0.0:$PORT'"
echo "  (1º início: baixa dados CNEFE ~1-2 GB — seja paciente)"
echo ""

exec proot-distro login ubuntu -- bash -c "
  export GEOCODEBR_PORT=$PORT
  if [[ -f /root/viax-geocodebr/start.R ]]; then
    exec Rscript /root/viax-geocodebr/start.R
  elif [[ -f /root/viax-geocodebr/plumber.R ]]; then
    exec Rscript /root/viax-geocodebr/plumber.R
  else
    echo 'ERRO: nenhum arquivo R encontrado em /root/viax-geocodebr/'
    echo 'Copie plumber.R ou start.R para esse diretório e tente novamente.'
    exit 1
  fi
"
STARTSCRIPT
chmod +x "$APP/start-geocodebr.sh"
ok "start-geocodebr.sh criado"

# ---------------------------------------------------------------------------
# PASSO 9 — Adiciona GEOCODEBR_URL ao .env (se ainda não existir)
# ---------------------------------------------------------------------------
if [[ -f "$APP/.env" ]] && ! grep -q "GEOCODEBR_URL" "$APP/.env"; then
  printf '\n# GeocodeR BR — descomente após iniciar: bash %s/start-geocodebr.sh\n# GEOCODEBR_URL=http://localhost:8002\n' "$APP" >> "$APP/.env"
  ok ".env atualizado com GEOCODEBR_URL (comentado)"
fi

# ---------------------------------------------------------------------------
# Resumo final
# ---------------------------------------------------------------------------
echo ""
echo -e "${G}${B}╔══════════════════════════════════════════╗${N}"
echo -e "${G}${B}║      Instalação concluída com sucesso!   ║${N}"
echo -e "${G}${B}╚══════════════════════════════════════════╝${N}"
echo ""
echo -e "  ${B}Iniciar o serviço:${N}"
echo -e "    ${C}bash $APP/start-geocodebr.sh${N}"
echo ""
echo -e "  ${B}Ativar no ViaX:${N}"
echo -e "    Configurações → Instâncias → GeocodeR BR"
echo ""
echo -e "  ${B}Variável de ambiente:${N}"
echo -e "    ${C}GEOCODEBR_URL=http://localhost:8002${N}"
echo ""
echo -e "  ${Y}Dica:${N} na primeira execução o CNEFE (~1-2 GB) será baixado automaticamente."
echo ""

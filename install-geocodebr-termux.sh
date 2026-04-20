#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Instalador do GeocodeR BR para Termux (Android)
#  Fonte: CNEFE / IBGE via pacote geocodebr do IPEA
#  Porta: 8002
#
#  Como usar:
#    curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install-geocodebr-termux.sh | bash
#
#  Ou, após clonar o repositório:
#    bash ~/viax-system/install-geocodebr-termux.sh
#
#  Pré-requisito: Termux instalado do F-Droid (NÃO da Play Store)
#    https://f-droid.org/packages/com.termux/
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC} $*"; }
warn()    { echo -e "${YELLOW}[aviso]${NC} $*"; }
die()     { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}==> $*${NC}"; }

# Verificar se está no Termux
if [[ -z "${TERMUX_VERSION:-}" ]] && [[ ! -d "/data/data/com.termux" ]]; then
  die "Este script é exclusivo para Android via Termux."
fi

echo ""
echo -e "${BOLD}${CYAN}ViaX:Trace — Instalador GeocodeR BR${NC}"
echo -e "  Motor  : CNEFE / IBGE (pacote geocodebr do IPEA)"
echo -e "  Porta  : 8002"
echo ""
warn "A instalação dos pacotes R pode demorar 15-40 minutos."
warn "Certifique-se de ter pelo menos 3 GB de armazenamento disponível."
echo ""

# Detectar diretório da aplicação
if [[ -d "$HOME/viax-system" ]]; then
  APP_DIR="$HOME/viax-system"
elif [[ -f "$(pwd)/artifacts/geocodebr-service/plumber.R" ]]; then
  APP_DIR="$(pwd)"
else
  warn "Diretório viax-system não encontrado. Scripts serão criados em $HOME."
  APP_DIR="$HOME"
fi

info "Diretório da aplicação: $APP_DIR"

# ---------------------------------------------------------------------------
# 1. ATUALIZAR REPOSITÓRIOS DO TERMUX
# ---------------------------------------------------------------------------
header "Atualizando repositórios"

info "Atualizando lista de pacotes..."
# Termux às vezes precisa que o usuário selecione um mirror manualmente.
# Tentamos pkg update primeiro e capturamos o erro.
if ! pkg update -y 2>&1; then
  warn "Falha ao atualizar pacotes. Tentando selecionar melhor mirror..."
  echo ""
  echo -e "${YELLOW}Execute o comando abaixo para selecionar um mirror e depois rode este script novamente:${NC}"
  echo -e "  ${BOLD}termux-change-repo${NC}"
  echo ""
  echo -e "  Selecione: ${BOLD}Single mirror${NC} → ${BOLD}Albatross (https://albatross.termux.dev)${NC}"
  echo ""
  read -r -p "Pressione ENTER para tentar mesmo assim, ou Ctrl+C para cancelar: "
fi

# ---------------------------------------------------------------------------
# 2. INSTALAR R
# ---------------------------------------------------------------------------
header "Instalando R"

install_r() {
  if command -v R &>/dev/null; then
    success "R já instalado: $(R --version 2>&1 | head -1)"
    return 0
  fi

  info "Tentando instalar r-base..."
  if pkg install -y r-base 2>&1; then
    success "R instalado via r-base"
    return 0
  fi

  warn "Pacote 'r-base' não encontrado. Tentando mirror alternativo..."

  # Adiciona mirror que sabidamente tem r-base
  local SOURCES_FILE="$PREFIX/etc/apt/sources.list"
  local BACKUP="$PREFIX/etc/apt/sources.list.bak"

  cp "$SOURCES_FILE" "$BACKUP" 2>/dev/null || true

  # Tenta mirror que tem r-base disponível
  for MIRROR in \
    "https://packages.termux.dev/apt/termux-main" \
    "https://dl.bintray.com/termux/termux-packages-24" \
    "https://termux.mentality.rip/termux-main" \
    "https://grimler.se/termux/termux-main" \
  ; do
    info "Tentando mirror: $MIRROR"
    echo "deb $MIRROR stable main" > "$SOURCES_FILE"
    pkg update -y 2>/dev/null || true
    if pkg install -y r-base 2>&1; then
      success "R instalado via $MIRROR"
      return 0
    fi
  done

  # Restaura sources originais
  [[ -f "$BACKUP" ]] && cp "$BACKUP" "$SOURCES_FILE"
  pkg update -y 2>/dev/null || true

  return 1
}

if ! install_r; then
  echo ""
  echo -e "${RED}${BOLD}Não foi possível instalar o R automaticamente.${NC}"
  echo ""
  echo -e "Soluções:"
  echo -e "  ${BOLD}1. Trocar mirror e tentar de novo:${NC}"
  echo -e "     termux-change-repo"
  echo -e "     (Selecione: Albatross ou mirrors.pku.edu.cn)"
  echo -e "     pkg install r-base"
  echo ""
  echo -e "  ${BOLD}2. Usar o microserviço via Docker (em outro dispositivo):${NC}"
  echo -e "     docker run -p 8002:8002 -v geocodebr-cache:/root/.cache viax-geocodebr"
  echo -e "     Configure GEOCODEBR_URL=http://IP-DO-SERVIDOR:8002 no .env"
  echo ""
  echo -e "  ${BOLD}3. Usar o motor padrão OSM (Photon + Nominatim):${NC}"
  echo -e "     Acesse Configurações → Instâncias → Padrão Gratuito"
  echo ""
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. INSTALAR DEPENDÊNCIAS DO SISTEMA PARA PACOTES R ESPACIAIS
# ---------------------------------------------------------------------------
header "Instalando dependências do sistema"

SYSDEPS=(
  "libgdal"
  "libgeos"
  "proj"
  "libudunits2"
  "libcurl"
  "openssl"
  "libxml2"
)

for dep in "${SYSDEPS[@]}"; do
  if ! dpkg -l "$dep" &>/dev/null 2>&1; then
    info "Instalando $dep..."
    pkg install -y "$dep" 2>/dev/null || warn "$dep não disponível — pode não ser necessário"
  else
    info "$dep já instalado"
  fi
done

success "Dependências do sistema prontas"

# ---------------------------------------------------------------------------
# 4. INSTALAR PACOTES R
# ---------------------------------------------------------------------------
header "Instalando pacotes R (plumber, geocodebr, future)"
info "Isso pode demorar 15-40 minutos — os pacotes são compilados localmente no Android."
echo ""

R --no-save --quiet <<'REOF'
options(
  repos = c(CRAN = "https://cran.rstudio.com/"),
  Ncpus = max(1L, parallel::detectCores() - 1L)
)

pkgs_necessarios <- c("plumber", "geocodebr", "future", "promises", "jsonlite")

for (p in pkgs_necessarios) {
  if (requireNamespace(p, quietly = TRUE)) {
    cat(sprintf("[ok] %s já instalado\n", p))
    next
  }
  cat(sprintf("[...] Instalando %s ...\n", p))
  tryCatch(
    install.packages(p, dependencies = TRUE, quiet = FALSE),
    error = function(e) cat(sprintf("[erro] Falha ao instalar %s: %s\n", p, conditionMessage(e)))
  )
}

# Verificação final
ausentes <- pkgs_necessarios[!sapply(pkgs_necessarios, requireNamespace, quietly = TRUE)]
if (length(ausentes) == 0) {
  cat("\n[ok] Todos os pacotes instalados com sucesso!\n")
  cat("[info] Na primeira execução o geocodebr baixa os dados do CNEFE (~1-2 GB).\n")
} else {
  cat(sprintf("\n[aviso] Pacotes com falha: %s\n", paste(ausentes, collapse = ", ")))
  cat("[aviso] Verifique o log acima e tente instalar manualmente:\n")
  cat(sprintf('  R -e "install.packages(c(%s))"\n', paste(sprintf("'%s'", ausentes), collapse = ", ")))
}
REOF

# ---------------------------------------------------------------------------
# 5. CRIAR SCRIPT DE INICIALIZAÇÃO DO MICROSERVIÇO
# ---------------------------------------------------------------------------
header "Criando script de inicialização"

GEOCODEBR_SCRIPT="$APP_DIR/start-geocodebr.sh"

cat > "$GEOCODEBR_SCRIPT" <<'STARTGEO'
#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Inicia o microserviço GeocodeR BR
#  Porta: 8002 (configurável via GEOCODEBR_PORT)
# =============================================================================
cd "$(dirname "$0")"

if ! command -v R &>/dev/null; then
  echo "[erro] R não encontrado."
  echo "  Instale com: pkg install r-base"
  echo "  Depois execute: bash ~/viax-system/install-geocodebr-termux.sh"
  exit 1
fi

# Verifica pacotes
R --no-save --quiet -e "
  pkgs <- c('plumber', 'geocodebr', 'future')
  ausentes <- pkgs[!sapply(pkgs, requireNamespace, quietly=TRUE)]
  if (length(ausentes) > 0) {
    cat('[erro] Pacotes ausentes:', paste(ausentes, collapse=', '), '\n')
    cat('Execute: bash ~/viax-system/install-geocodebr-termux.sh\n')
    quit(status=1)
  }
" || exit 1

PORT="${GEOCODEBR_PORT:-8002}"

echo "============================================================"
echo " ViaX:Trace — GeocodeR BR Microservice"
echo " Porta   : $PORT"
echo " Fonte   : CNEFE / IBGE"
echo "============================================================"
echo ""
echo "AVISO: No primeiro início, o geocodebr baixa os dados do"
echo "CNEFE (~1-2 GB). Isso pode demorar vários minutos."
echo "Aguarde 'Listening on 0.0.0.0:$PORT' antes de usar."
echo ""

# Define GEOCODEBR_PORT para o script R
export GEOCODEBR_PORT="$PORT"

# Inicia o servidor Plumber
PLUMBER_R="$(dirname "$0")/artifacts/geocodebr-service/start.R"
if [[ ! -f "$PLUMBER_R" ]]; then
  echo "[erro] Arquivo start.R não encontrado em: $PLUMBER_R"
  echo "Execute a partir do diretório raiz do ViaX:Trace."
  exit 1
fi

Rscript "$PLUMBER_R"
STARTGEO

chmod +x "$GEOCODEBR_SCRIPT"
success "Script criado: $GEOCODEBR_SCRIPT"

# ---------------------------------------------------------------------------
# 6. ATUALIZAR .ENV SE EXISTIR
# ---------------------------------------------------------------------------
ENV_FILE="$APP_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q "^GEOCODEBR_URL=" "$ENV_FILE"; then
    # Já tem a variável — garante que está comentada (usuário ativa manualmente)
    info ".env encontrado. Para ativar o GeocodeR BR, edite o .env:"
  else
    echo "" >> "$ENV_FILE"
    echo "# GeocodeR BR — ative após iniciar: bash ~/viax-system/start-geocodebr.sh" >> "$ENV_FILE"
    echo "# GEOCODEBR_URL=http://localhost:8002" >> "$ENV_FILE"
    info "Variável GEOCODEBR_URL adicionada ao .env (comentada)"
  fi
fi

# ---------------------------------------------------------------------------
# RESULTADO FINAL
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  GeocodeR BR instalado com sucesso! (Termux)     ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Próximo passo — Iniciar o microserviço:${NC}"
echo -e "  ${CYAN}bash ~/viax-system/start-geocodebr.sh${NC}"
echo ""
echo -e "  ${BOLD}Depois, ative na interface:${NC}"
echo -e "  Configurações → Instâncias → GeocodeR BR"
echo ""
echo -e "  ${BOLD}E adicione ao .env da API:${NC}"
echo -e "  ${CYAN}GEOCODEBR_URL=http://localhost:8002${NC}"
echo ""
echo -e "  ${YELLOW}Nota:${NC} O primeiro início baixa os dados do CNEFE (~1-2 GB)."
echo -e "  O download é feito uma única vez e fica em cache."
echo ""

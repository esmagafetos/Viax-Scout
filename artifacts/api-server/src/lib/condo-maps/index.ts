/**
 * @module condo-maps
 * @description
 * Motor semântico de parse e roteamento para condomínios fechados de Nova Califórnia
 * (Tamoios / Cabo Frio — RJ).
 *
 * ## Arquitetura do Parser
 *
 * O parse segue uma pipeline de quatro estágios:
 *
 *   1. NORMALIZAÇÃO — redução do texto a forma canônica (minúsculas, sem acentos,
 *      espaços colapsados) preservando o original para exibição.
 *
 *   2. EXTRAÇÃO DE TOKENS — cadeia de regexes ordenada por especificidade decrescente.
 *      Cada campo (quadra, lote) é extraído pelo primeiro padrão que casar, garantindo
 *      que formas mais explícitas (palavra-chave completa) sempre vençam inferências
 *      implícitas. Cada token registra o padrão que o produziu e uma pontuação de
 *      confiança (0–1).
 *
 *   3. RESOLUÇÃO SEMÂNTICA — conversão dos tokens brutos em valores tipados:
 *      identificadores puramente numéricos → `number`; com letras → `string` (quadraLetra / loteId).
 *      Lookup de quadra no mapa interno; detecção de rua interna; detecção de condo.
 *
 *   4. SCORING DE CONFIANÇA — pontuação global calculada como média ponderada dos
 *      tokens mais relevantes (quadra e lote). Permite ao sistema downstream
 *      priorizar ou descartar endereços ambíguos.
 *
 * ## Padrões de endereço observados no dataset real (Tamoios, Cabo Frio)
 *
 * Os padrões abaixo foram catalogados a partir de 210 pacotes reais:
 *
 *   Quadra — formas canônicas:
 *     "Quadra 9"        "Quadra A"        "Quadra 18PD"     "Quadra 46 lote 01"
 *     "QUADRA 9"        "Quadra13"        (sem espaço)
 *
 *   Quadra — formas abreviadas (keyword curta):
 *     "Qd 20"           "Qd. 20"          "Qd:20"           "QD16"   (sem espaço)
 *     "Qda 2"           "Qu 18PD"         "Qd E"            "Qd.10"
 *
 *   Quadra — forma mínima (Q isolado):
 *     "Q 01"            "Q. J"            "Q:01"            "Q24"    (sem espaço)
 *     "Q E"             "Q. A1"
 *
 *   Quadra — ordem invertida (lote precede quadra):
 *     "lt 17 qd 55"     "Lote 9 quadra 23"  "Lote 11 Quadra 08"  "Lote 13 quadra 30"
 *
 *   Lote — formas canônicas:
 *     "Lote 3"          "lote 01"         "Lote 4A"         "lote 05"
 *
 *   Lote — formas abreviadas:
 *     "Lt 11"           "LT4A"            "Lt.17"           "lt2"    (sem espaço)
 *     "LT.7"
 *
 *   Lote — formato com dois-pontos:
 *     "L:10"
 *
 *   Lote — L isolado com espaço:
 *     "L 04"            "L 5"
 *
 *   Formato compacto sem keyword:
 *     "L5Q5"            (parse: Q=5, L=5)
 *
 *   Identificadores alfanuméricos (quadra):
 *     "18PD"  "3APF"  "1B"  "A1"  "F1"  "B2"  "C3"  "D4"  "E5"  "H1"
 *
 *   Identificadores alfanuméricos (lote):
 *     "4A"   (confirmado no dataset: "LT4A")
 */

import type {
  CondoMap,
  ParsedAddress,
  ParseToken,
  DeliveryRow,
  RouteResult,
  Quadra,
} from "./types.js";
import { BOUGAINVILLE_III } from "./bougainville-iii.js";
import { GRAVATA_II } from "./gravata-ii.js";

// ─── Registro de condomínios ativos ───────────────────────────────────────────

const REGISTRY: Record<string, CondoMap> = {
  [BOUGAINVILLE_III.id]: BOUGAINVILLE_III,
  [GRAVATA_II.id]: GRAVATA_II,
};

const EM_DESENVOLVIMENTO: CondoMap[] = [
  { id: "bougainville-i",       nome: "Bougainville I",            status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "bougainville-ii",      nome: "Bougainville II",           status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "gravata-i",            nome: "Gravatá I",                 status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "residencial-nova-cal", nome: "Residencial Nova Califórnia", status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
];

export function listCondos(): { id: string; nome: string; status: CondoMap["status"]; totalLotes?: number }[] {
  return [
    ...Object.values(REGISTRY),
    ...EM_DESENVOLVIMENTO,
  ].map((c) => ({ id: c.id, nome: c.nome, status: c.status, totalLotes: c.totalLotes }));
}

export function getCondo(id: string): CondoMap | null {
  return REGISTRY[id] ?? EM_DESENVOLVIMENTO.find((c) => c.id === id) ?? null;
}

// ─── Etapa 1: Normalização ────────────────────────────────────────────────────

/**
 * Reduz a string à forma canônica para comparações insensíveis a
 * capitalização, acentos e espaçamento redundante.
 *
 * Preserva apenas caracteres ASCII a–z, 0–9, espaços e pontuação básica.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Etapa 2: Extração de tokens — Cadeia de Quadra ──────────────────────────

/**
 * Cadeia de padrões para extração do identificador de quadra.
 *
 * Ordenada por especificidade decrescente: o primeiro padrão que casar é
 * utilizado, garantindo que formas mais explícitas prevaleçam sobre inferências.
 *
 * Grupo 1 de cada regex captura o identificador bruto (ex: "18pd", "a1", "9").
 *
 * Confiança:
 *   1.00 → palavra-chave canônica ("quadra")
 *   0.95 → abreviação estabelecida ("qd", "qda", "qu" + espaço)
 *   0.85 → forma com ponto ou dois-pontos ("qd.", "q.")
 *   0.75 → forma mínima "Q" com espaço antes de número/letra
 *   0.65 → "Q" colado ao número sem espaço ("Q24")
 *   0.55 → formato compacto sem keyword ("L5Q5")
 */
const QUADRA_CHAIN: Array<{ id: string; re: RegExp; confianca: number }> = [
  // ── QK-1: palavra-chave completa "quadra" ────────────────────────────────
  // Exemplos: "Quadra 9", "QUADRA 9", "Quadra13", "quadra 18PD", "Quadra A1"
  // Captura: qualquer identificador alfanumérico imediatamente após "quadra"
  // (com ou sem espaço separador, para cobrir "Quadra13").
  {
    id: "QK-1",
    re: /\bquadra\s*\.?\s*([0-9]{1,3}[a-z]{0,5}|[a-z]{1,4}[0-9]{0,3})\b/gi,
    confianca: 1.00,
  },

  // ── QK-2: "qda" (variante regional de "quadra") ──────────────────────────
  // Exemplos: "Qda 2", "qda 3"
  {
    id: "QK-2",
    re: /\bqda\s+([0-9]{1,3}[a-z]{0,5}|[a-z]{1,4}[0-9]{0,3})\b/gi,
    confianca: 0.95,
  },

  // ── QK-3: "qu " (abreviação com espaço obrigatório) ──────────────────────
  // Exemplos: "Qu 18PD", "Qu A", "Qu B2"
  // NOTA: exige espaço após "qu" para não capturar "qual", "quando", etc.
  {
    id: "QK-3",
    re: /\bqu\s+([0-9]{1,3}[a-z]{0,5}|[a-z]{1,4}[0-9]{0,3})\b/gi,
    confianca: 0.95,
  },

  // ── QK-4: "qd" com ponto, dois-pontos ou espaço ──────────────────────────
  // Exemplos: "Qd 20", "Qd.10", "Qd:20", "QD16" (sem espaço)
  // A classe [\s:.]* aceita espaço, dois-pontos, ponto e ausência de separador.
  {
    id: "QK-4",
    re: /\bqd[\s:.]*([0-9]{1,3}[a-z]{0,5}|[a-z]{1,4}[0-9]{0,3})\b/gi,
    confianca: 0.90,
  },

  // ── QA-1: "Q." seguido de letra (quadras por letra com ponto) ────────────
  // Exemplos: "Q. J", "Q. A1", "Q. E"
  {
    id: "QA-1",
    re: /\bq\.\s*([a-z][a-z0-9]{0,4})\b/gi,
    confianca: 0.85,
  },

  // ── QA-2: "Q:" (dois-pontos) ─────────────────────────────────────────────
  // Exemplos: "Q:01", "Q:A"
  {
    id: "QA-2",
    re: /\bq:([0-9]{1,3}[a-z]{0,4}|[a-z][a-z0-9]{0,3})\b/gi,
    confianca: 0.85,
  },

  // ── QA-3: "Q " com espaço antes de número ou letra ───────────────────────
  // Exemplos: "Q 01", "Q A", "Q E"
  // NOTA: requer que "Q" seja token isolado (word boundary) seguido de espaço.
  {
    id: "QA-3",
    re: /\bq\s+([0-9]{1,3}[a-z]{0,4}|[a-z][a-z0-9]{0,3})\b/gi,
    confianca: 0.75,
  },

  // ── QN-1: "Q" colado a dígitos (sem separador) ───────────────────────────
  // Exemplos: "Q24", "Q9"
  // Exclui sufixo de palavra para evitar "Qd" (já coberto por QK-4).
  {
    id: "QN-1",
    re: /\bq([0-9]{1,3})\b(?!\s*[a-z]{2,})/gi,
    confianca: 0.65,
  },

  // ── QF-1: formato compacto "L{n}Q{n}" (lote e quadra concatenados) ───────
  // Exemplos: "L5Q5" (de "Rua Lunar, L5Q5, Entrada 3")
  // Grupo 1 = lote, Grupo 2 = quadra — tratamento especial no extrator.
  {
    id: "QF-1",
    re: /\bl([0-9]{1,3})q([0-9]{1,3})\b/gi,
    confianca: 0.55,
  },
];

// ─── Etapa 2: Extração de tokens — Cadeia de Lote ────────────────────────────

/**
 * Cadeia de padrões para extração do identificador de lote.
 *
 * Confiança:
 *   1.00 → "lote" canônico
 *   0.95 → "lt" com espaço ou ponto
 *   0.85 → "L:" (formato colon)
 *   0.75 → "L " (L isolado + espaço + número)
 *   0.55 → formato compacto "L5Q5" (grupo 1)
 */
const LOTE_CHAIN: Array<{ id: string; re: RegExp; confianca: number }> = [
  // ── LK-1: "lote" canônico ─────────────────────────────────────────────────
  // Exemplos: "Lote 3", "lote 01", "Lote 4A", "lote05" (sem espaço)
  {
    id: "LK-1",
    re: /\blote\s*\.?\s*0*([0-9]{1,4}[a-z]?)\b/gi,
    confianca: 1.00,
  },

  // ── LK-1b: "lote" colado a número (sem word boundary) ───────────────────
  // Cobre casos como "24lote 01" onde o número de quadra está concatenado
  // à keyword "lote" sem espaço separador.
  // Lookbehind negativo (?<![a-z]) garante que "lote" não seja sufixo de
  // outra palavra (ex: "pilote"), mas permite ser sufixo de dígito ("24lote").
  // Node.js ≥ v12 suporta lookbehind ES2018.
  {
    id: "LK-1b",
    re: /(?<![a-z])lote\s*\.?\s*0*([0-9]{1,4}[a-z]?)\b/gi,
    confianca: 0.88,
  },

  // ── LK-2: "lt" com ou sem ponto/espaço ───────────────────────────────────
  // Exemplos: "Lt 11", "LT4A", "Lt.17", "lt2", "LT.7"
  {
    id: "LK-2",
    re: /\blt\.?\s*:?\s*0*([0-9]{1,4}[a-z]?)\b/gi,
    confianca: 0.95,
  },

  // ── LK-3: "L:" (formato dois-pontos) ─────────────────────────────────────
  // Exemplos: "L:10", "L:4A"
  {
    id: "LK-3",
    re: /\bl:0*([0-9]{1,4}[a-z]?)\b/gi,
    confianca: 0.85,
  },

  // ── LK-4: "L " (L isolado + espaço + número) ─────────────────────────────
  // Exemplos: "L 04", "L 5"
  // CUIDADO: "L" deve ser token isolado; palavra seguinte começa com dígito.
  // Exclui casos como "lado", "leste" (que não são seguidos por dígito diretamente).
  {
    id: "LK-4",
    re: /\bl\s+0*([0-9]{1,4}[a-z]?)\b/gi,
    confianca: 0.75,
  },

  // ── LF-1: formato compacto "L{n}Q{n}" — grupo 1 é o lote ────────────────
  // Sincronizado com QF-1 na cadeia de quadra.
  {
    id: "LF-1",
    re: /\bl([0-9]{1,3})q([0-9]{1,3})\b/gi,
    confianca: 0.55,
  },
];

// ─── Etapa 2: Detecção de loja ────────────────────────────────────────────────

/**
 * Palavras-chave que indicam estabelecimento comercial.
 * Testadas contra o endereço original (case-insensitive).
 */
const LOJA_KEYWORDS = /\b(?:loja|comercio|comercial|mercearia|mercado|padaria|supermercado|farmacia|barbearia|salao|restaurante|bar\b|pet\s*shop|academia|posto)\b/i;

/** Variantes normalizadas do nome "Rua Das Pacas". */
const RUA_DAS_PACAS_VARIANTS = ["rua das pacas", "r das pacas", "r. das pacas"];

// ─── Etapa 2: Aliases de condomínio ──────────────────────────────────────────

/**
 * Mapa de aliases normalizados por ID de condomínio.
 *
 * Cada array contém formas alternativas do nome que um motorista/operador
 * pode usar ao digitar o endereço (grafias, abreviações, erros comuns).
 */
const CONDO_ALIASES: Record<string, string[]> = {
  "gravata-ii": [
    "gravata ii", "gravata 2", "gravatá ii", "gravatá 2",
    "cond gravata 2", "condominio gravata 2", "condomínio gravatá 2",
    "cond gravatá ii", "sitio gravata 2", "sítio gravatá 2", "sítio gravata2",
    "sitio gravata2", "nova california sitio gravata2", "nova califórnia sítio gravatá 2",
  ],
  "gravata-i": [
    "gravata i", "gravata 1", "gravatá i", "gravatá 1",
    "condominio gravata 1", "condomínio gravatá 1",
  ],
  "bougainville-iii": [
    "bougainville iii", "bougainville 3", "bouganville iii", "bouganville 3",
    "bougainville", "bouganville",
  ],
  "bougainville-ii": [
    "bougainville ii", "bougainville 2", "bouganville ii", "bouganville 2",
  ],
  "bougainville-i": [
    "bougainville i", "bougainville 1", "bouganville i", "bouganville 1",
  ],
  "residencial-nova-cal": [
    "residencial nova california", "nova california", "nova califórnia",
    "residencial nova califórnia", "res nova cal",
  ],
};

function condoCitadoNorm(normAddr: string, condo: CondoMap): boolean {
  const aliases = CONDO_ALIASES[condo.id];
  if (aliases) return aliases.some((a) => normAddr.includes(normalize(a)));
  return normAddr.includes(normalize(condo.nome));
}

// ─── Etapa 2: Executor da cadeia de extração ──────────────────────────────────

/**
 * Executa a cadeia de padrões sobre o endereço normalizado.
 * Retorna o primeiro token que casar (maior confiança primeiro).
 *
 * Para o padrão QF-1 / LF-1 (formato compacto "L5Q5"), o grupo capturado
 * depende do campo sendo extraído (quadra → grupo 2, lote → grupo 1).
 */
function extractToken(
  normAddr: string,
  chain: typeof QUADRA_CHAIN,
  campo: ParseToken["campo"],
): ParseToken | null {
  for (const { id, re, confianca } of chain) {
    re.lastIndex = 0; // Reset para regex global
    const m = re.exec(normAddr);
    if (!m) continue;

    let valorBruto: string;
    if (id === "QF-1") {
      // Formato compacto: grupo 1 = lote, grupo 2 = quadra
      valorBruto = campo === "quadra" ? (m[2] ?? m[1]) : (m[1] ?? m[2]);
    } else {
      valorBruto = m[1];
    }

    if (!valorBruto) continue;

    // ── Pós-processamento de quadra ──────────────────────────────────────────
    // Casos como "Quadra 24lote 01" fazem o regex QK-1 capturar "24lote"
    // porque não há espaço separando o número da keyword "lote".
    // Removemos sufixos de lote/lt que tenham sido incorporados erroneamente
    // ao identificador da quadra.
    if (campo === "quadra") {
      valorBruto = valorBruto.replace(/lote?$/i, "").replace(/\blt$/i, "").trim();
      if (!valorBruto) continue; // Token vazio após limpeza — descartar
    }

    return { campo, valorBruto: valorBruto.toUpperCase(), padrao: id, confianca };
  }
  return null;
}

// ─── Etapa 3: Resolução de identificadores ───────────────────────────────────

/**
 * Classifica um identificador bruto em numérico puro ou alfanumérico.
 *
 * Retorna `{ numero: N }` quando o valor é inteiro puro após remoção de zeros
 * à esquerda; `{ letra: S }` quando contém qualquer caractere não-dígito.
 */
function resolveId(raw: string): { numero: number } | { letra: string } {
  const cleaned = raw.replace(/^0+/, "") || "0";
  if (/^[0-9]+$/.test(cleaned)) return { numero: parseInt(cleaned, 10) };
  return { letra: raw.toUpperCase() };
}

// ─── Lookup de quadra no mapa ─────────────────────────────────────────────────

/**
 * Localiza a quadra correspondente no mapa do condomínio.
 *
 * Estratégia de lookup (por prioridade):
 *   1. Número exato (quando `parsed.quadra` não é null).
 *   2. Letra/ID exato (quando `parsed.quadraLetra` não é null):
 *      a. Comparação direta de `q.letra.toUpperCase()`.
 *      b. Comparação normalizada (remove espaços e hífens).
 *   3. Retorna null quando não encontrado.
 */
function findQuadra(condo: CondoMap, parsed: ParsedAddress): Quadra | null {
  if (parsed.quadra !== null) {
    return condo.quadras.find((q) => q.numero === parsed.quadra) ?? null;
  }
  if (parsed.quadraLetra !== null) {
    const target = parsed.quadraLetra.toUpperCase().replace(/[\s\-]/g, "");
    return (
      condo.quadras.find((q) => {
        if (!q.letra) return false;
        const qn = q.letra.toUpperCase().replace(/[\s\-]/g, "");
        return qn === target;
      }) ?? null
    );
  }
  return null;
}

// ─── Etapa 3: Lookup de rua interna ───────────────────────────────────────────

function findRuaCitada(normAddr: string, condo: CondoMap): string | null {
  for (const rua of condo.ruas) {
    const candidates = [rua.nome, rua.apelido].filter(Boolean) as string[];
    for (const c of candidates) {
      if (normAddr.includes(normalize(c))) return rua.nome;
    }
  }
  return null;
}

// ─── API pública: parseEndereco ────────────────────────────────────────────────

/**
 * Analisa semanticamente um endereço de entrega no contexto de um condomínio.
 *
 * @param endereco - Endereço bruto como informado pelo operador/sistema logístico.
 * @param condo    - Mapa interno do condomínio (quadras, ruas, aliases).
 * @returns        - Endereço parseado com todos os campos semânticos e diagnósticos.
 *
 * @example
 * // Endereço com quadra alfanumérica e lote com sufixo de letra
 * parseEndereco("Rua Lima Barreto Qu 18PD, LT4A, Gravatá II", GRAVATA_II)
 * // → { quadraLetra: "18PD", lote: null, loteId: "4A", confianca: 95, ... }
 *
 * @example
 * // Ordem invertida (lote antes da quadra)
 * parseEndereco("Casa lt 17 qd 55 unamar", GRAVATA_II)
 * // → { quadra: 55, lote: 17, confianca: 90, ... }
 *
 * @example
 * // Formato compacto sem keyword
 * parseEndereco("Rua Lunar, L5Q5, Entrada 3", GRAVATA_II)
 * // → { quadra: 5, lote: 5, confianca: 55, ... }
 */
export function parseEndereco(endereco: string, condo: CondoMap): ParsedAddress {
  const norm = normalize(endereco);
  const tokens: ParseToken[] = [];

  // ── Detecção de loja / comércio ──────────────────────────────────────────
  const isRuaDasPacas = RUA_DAS_PACAS_VARIANTS.some((v) => norm.includes(v));
  const hasLojaKeyword = LOJA_KEYWORDS.test(endereco);
  const isLoja = isRuaDasPacas && hasLojaKeyword;

  if (isLoja) {
    tokens.push({ campo: "loja", valorBruto: "loja", padrao: "LOJA-DET", confianca: 1.0 });
  }

  // ── Extração de quadra ───────────────────────────────────────────────────
  const quadraToken = extractToken(norm, QUADRA_CHAIN, "quadra");
  if (quadraToken) tokens.push(quadraToken);

  let quadra: number | null = null;
  let quadraLetra: string | null = null;

  if (quadraToken) {
    const resolved = resolveId(quadraToken.valorBruto);
    if ("numero" in resolved) quadra = resolved.numero;
    else quadraLetra = resolved.letra;
  }

  // ── Extração de lote ─────────────────────────────────────────────────────
  const loteToken = extractToken(norm, LOTE_CHAIN, "lote");
  if (loteToken) tokens.push(loteToken);

  let lote: number | null = null;
  let loteId: string | null = null;

  if (loteToken) {
    const resolved = resolveId(loteToken.valorBruto);
    if ("numero" in resolved) lote = resolved.numero;
    else loteId = resolved.letra;
  }

  // ── Rua interna ──────────────────────────────────────────────────────────
  const ruaCitada = findRuaCitada(norm, condo);
  if (ruaCitada) {
    tokens.push({ campo: "rua", valorBruto: ruaCitada, padrao: "RUA-LOOKUP", confianca: 1.0 });
  }

  // ── Condomínio citado ─────────────────────────────────────────────────────
  const condoCitado = condoCitadoNorm(norm, condo);
  if (condoCitado) {
    tokens.push({ campo: "condominio", valorBruto: condo.nome, padrao: "CONDO-ALIAS", confianca: 1.0 });
  }

  // ── Scoring de confiança global ──────────────────────────────────────────
  // Pesos: quadra (40%) + lote (40%) + rua (10%) + condo (10%).
  // Bônus de +0.5 por token quando ambos quadra e lote estão presentes.
  let score = 0;
  const qConf = (quadraToken?.confianca ?? 0) * 40;
  const lConf = (loteToken?.confianca ?? 0) * 40;
  const rConf = ruaCitada ? 10 : 0;
  const cConf = condoCitado ? 10 : 0;
  score = qConf + lConf + rConf + cConf;
  // Bônus de complementaridade: quando ambos campos principais presentes, score mais confiável
  if (quadraToken && loteToken) score = Math.min(100, score * 1.05);
  const confianca = Math.round(score);

  return {
    quadra,
    quadraLetra,
    lote,
    loteId,
    ruaCitada,
    condoCitado,
    isLoja,
    confianca,
    tokens,
    enderecoOriginal: endereco,
  };
}

// ─── Instruções de navegação ──────────────────────────────────────────────────

function quadraLabel(q: Quadra): string {
  if (q.letra) return `Quadra ${q.letra}`;
  if (q.numero !== undefined) return `Quadra ${q.numero}`;
  return "Quadra ?";
}

function loteLabel(row: DeliveryRow): string {
  if (row.loteId) return `Lote ${row.loteId}`;
  if (row.lote !== null) return `Lote ${row.lote}`;
  return "Lote ?";
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Gera instrução de navegação entre duas quadras usando produto vetorial.
 *
 * O ângulo entre o vetor de entrada (prev → current) e o vetor de saída
 * (current → next) determina a manobra:
 *   |ângulo| < 25°       → siga em frente
 *   25° < ângulo ≤ 110°  → vire à direita (ângulo positivo = curva horária)
 *   ângulo > 110°        → retorno à direita
 *   análogo negativo     → esquerda
 */
function instructionFor(
  prev: { x: number; y: number },
  current: Quadra,
  next: Quadra | null,
): string {
  if (!next) {
    return `Entregar em ${quadraLabel(current)} e finalizar a rota.`;
  }
  const vIn  = { x: current.x - prev.x, y: current.y - prev.y };
  const vOut = { x: next.x - current.x, y: next.y - current.y };
  const cross = vIn.x * vOut.y - vIn.y * vOut.x;
  const dot   = vIn.x * vOut.x + vIn.y * vOut.y;
  const angle = Math.atan2(cross, dot) * (180 / Math.PI);

  let manobra: string;
  if (Math.abs(angle) < 25)              manobra = "siga em frente";
  else if (angle >  25 && angle <= 110)  manobra = "vire à direita";
  else if (angle > 110)                  manobra = "faça o retorno à direita";
  else if (angle < -25 && angle >= -110) manobra = "vire à esquerda";
  else                                   manobra = "faça o retorno à esquerda";

  return `Saindo de ${quadraLabel(current)}, ${manobra} em direção a ${quadraLabel(next)}.`;
}

// ─── API pública: buildRoute ───────────────────────────────────────────────────

/**
 * Constrói a rota otimizada para uma lista de entregas num condomínio.
 *
 * ## Algoritmo
 *
 * 1. Cada endereço é parseado via `parseEndereco`.
 * 2. Entregas roteáveis (quadra identificada + lote presente) entram na fila
 *    de otimização; demais são classificadas e explicadas.
 * 3. Sequenciamento pelo algoritmo Nearest-Neighbor a partir da portaria:
 *    - Distância euclidiana no plano cartesiano normalizado.
 *    - Desempate pelo número/ID do lote (para entregas na mesma quadra).
 * 4. Instruções de navegação geradas por análise de ângulo vetorial.
 *
 * ## Classificações de saída
 *
 *   "ordenada"               → endereço completo com nome do condomínio; roteado.
 *   "encontrada_sem_condominio" → quadra e lote encontrados, mas condo não mencionado.
 *   "loja"                   → comércio na Rua Das Pacas; acesso direto, sem roteamento.
 *   "nuance"                 → endereço incompleto ou quadra não mapeada.
 */
export function buildRoute(
  rows: { linha: number; endereco: string }[],
  condo: CondoMap,
): RouteResult {
  const t0 = Date.now();
  const detalhes: DeliveryRow[] = [];
  const orderable: { row: DeliveryRow; quadra: Quadra }[] = [];

  for (const r of rows) {
    const parsed = parseEndereco(r.endereco, condo);

    // ── Loja / comércio (Rua das Pacas) ──────────────────────────────────
    if (parsed.isLoja) {
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: null,
        quadraLetra: null,
        lote: parsed.lote,
        loteId: parsed.loteId,
        classificacao: "loja",
        motivo: "Comércio/loja identificado na Rua Das Pacas — acesso direto, sem roteamento interno.",
        confiancaParse: parsed.confianca,
      });
      continue;
    }

    // ── Lote ausente → nuance ──────────────────────────────────────────────
    const temQuadra = parsed.quadra !== null || parsed.quadraLetra !== null;
    const temLote   = parsed.lote !== null || parsed.loteId !== null;

    if (!temQuadra || !temLote) {
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: parsed.quadra,
        quadraLetra: parsed.quadraLetra,
        lote: parsed.lote,
        loteId: parsed.loteId,
        classificacao: "nuance",
        motivo: !temQuadra && !temLote
          ? "Endereço incompleto: quadra e lote não informados."
          : !temQuadra
          ? "Quadra não informada no endereço."
          : "Lote não informado no endereço.",
        confiancaParse: parsed.confianca,
      });
      continue;
    }

    // ── Lookup de quadra no mapa interno ──────────────────────────────────
    const quadraObj = findQuadra(condo, parsed);
    if (!quadraObj) {
      const ref = parsed.quadraLetra ?? `${parsed.quadra}`;
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: parsed.quadra,
        quadraLetra: parsed.quadraLetra,
        lote: parsed.lote,
        loteId: parsed.loteId,
        classificacao: "nuance",
        motivo: `Quadra "${ref}" não consta no mapa interno do condomínio ${condo.nome}.`,
        confiancaParse: parsed.confianca,
      });
      continue;
    }

    const row: DeliveryRow = {
      linha: r.linha,
      enderecoOriginal: r.endereco,
      quadra: quadraObj.numero ?? null,
      quadraLetra: quadraObj.letra ?? null,
      lote: parsed.lote,
      loteId: parsed.loteId,
      classificacao: parsed.condoCitado ? "ordenada" : "encontrada_sem_condominio",
      motivo: parsed.condoCitado
        ? "Endereço completo com condomínio informado."
        : `Endereço encontrado, mas o nome do condomínio (${condo.nome}) não foi mencionado.`,
      confiancaParse: parsed.confianca,
    };
    orderable.push({ row, quadra: quadraObj });
  }

  // ── Nearest-neighbor a partir da portaria ─────────────────────────────────
  const visited = new Array(orderable.length).fill(false);
  let cursor: { x: number; y: number } = condo.entrada;
  const sequence: { row: DeliveryRow; quadra: Quadra }[] = [];

  while (sequence.length < orderable.length) {
    let bestIdx = -1, bestScore = Infinity;
    for (let i = 0; i < orderable.length; i++) {
      if (visited[i]) continue;
      const d = dist(cursor, orderable[i].quadra);
      // Desempate: usar número de lote (ou 0) para entregas equidistantes.
      const tieBreaker = (orderable[i].row.lote ?? 0) * 0.001;
      const score = d + tieBreaker;
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    visited[bestIdx] = true;
    sequence.push(orderable[bestIdx]);
    cursor = orderable[bestIdx].quadra;
  }

  // ── Geração de instruções ─────────────────────────────────────────────────
  let prev: { x: number; y: number } = condo.entrada;
  for (let i = 0; i < sequence.length; i++) {
    const cur = sequence[i];
    const nxt = sequence[i + 1] ?? null;
    cur.row.ordem = i + 1;
    cur.row.instrucao = i === 0
      ? `Saindo da portaria, siga até ${quadraLabel(cur.quadra)} (${loteLabel(cur.row)}).`
      : instructionFor(prev, cur.quadra, nxt?.quadra ?? null) + ` ${loteLabel(cur.row)}.`;
    detalhes.push(cur.row);
    prev = cur.quadra;
  }

  // ── Ordenação final ───────────────────────────────────────────────────────
  detalhes.sort((a, b) => {
    if (a.ordem && b.ordem)   return a.ordem - b.ordem;
    if (a.ordem && !b.ordem)  return -1;
    if (!a.ordem && b.ordem)  return 1;
    return a.linha - b.linha;
  });

  return {
    condominio: { id: condo.id, nome: condo.nome },
    totalLinhas: rows.length,
    totalOrdenadas: detalhes.filter((d) => d.classificacao === "ordenada").length,
    totalSemCondominio: detalhes.filter((d) => d.classificacao === "encontrada_sem_condominio").length,
    totalNuances: detalhes.filter((d) => d.classificacao === "nuance").length,
    totalLojas: detalhes.filter((d) => d.classificacao === "loja").length,
    detalhes,
    metricas: { tempo_ms: Date.now() - t0 },
  };
}

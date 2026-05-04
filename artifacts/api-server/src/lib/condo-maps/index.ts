import type {
  CondoMap,
  ParsedAddress,
  DeliveryRow,
  RouteResult,
  Quadra,
} from "./types.js";
import { BOUGAINVILLE_III } from "./bougainville-iii.js";
import { GRAVATA_II } from "./gravata-ii.js";

const REGISTRY: Record<string, CondoMap> = {
  [BOUGAINVILLE_III.id]: BOUGAINVILLE_III,
  [GRAVATA_II.id]: GRAVATA_II,
};

const EM_DESENVOLVIMENTO: CondoMap[] = [
  { id: "bougainville-i",       nome: "Bougainville I",       status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "bougainville-ii",      nome: "Bougainville II",      status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "gravata-i",            nome: "Gravatá I",            status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
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

// ─── Normalização ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Regexes ─────────────────────────────────────────────────────────────────

const QUADRA_NUM_REGEX  = /\b(?:q(?:uadra|d)?\.?|qd)\s*0*([0-9]{1,3})\b/i;
const QUADRA_LETRA_REGEX = /\b(?:q(?:uadra|d)?\.?|qd|quadra)\s*([A-Z][A-Z0-9]*)\b/i;
const LOTE_REGEX        = /\b(?:l(?:ote|t)?\.?|lt)\s*0*([0-9]{1,4})\b/i;
const ALT_QL_REGEX      = /\b0*([0-9]{1,3})\s*[\/\-x]\s*0*([0-9]{1,4})\b/;

const LOJA_KEYWORDS     = /\b(?:loja|comercio|comercial|mercearia|mercado|padaria|supermercado|farmacia|barbearia|salao|restaurante|bar|pet\s*shop|academia|posto)\b/i;
const RUA_DAS_PACAS_NORM = "rua das pacas";

const CONDO_ALIASES: Record<string, string[]> = {
  "gravata-ii": [
    "gravata ii", "gravata 2", "gravatá ii", "gravatá 2",
    "cond gravata 2", "condominio gravata 2", "condomínio gravatá 2",
    "cond gravatá ii",
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
  const n = normalize(condo.nome);
  return normAddr.includes(n);
}

// ─── Parse ───────────────────────────────────────────────────────────────────

export function parseEndereco(endereco: string, condo: CondoMap): ParsedAddress {
  const norm = normalize(endereco);

  // ── Detecção de loja / comércio ──
  const isRuaDasPacas = norm.includes(RUA_DAS_PACAS_NORM) || norm.includes("r das pacas");
  const hasLojaKeyword = LOJA_KEYWORDS.test(endereco);
  const isLoja = isRuaDasPacas && hasLojaKeyword;

  // ── Quadra numérica ──
  let quadra: number | null = null;
  let quadraLetra: string | null = null;

  const mQNum = endereco.match(QUADRA_NUM_REGEX);
  if (mQNum) quadra = parseInt(mQNum[1], 10);

  // ── Quadra por letra (se não encontrou número) ──
  if (quadra === null) {
    const mQLet = endereco.match(QUADRA_LETRA_REGEX);
    if (mQLet) quadraLetra = mQLet[1].toUpperCase();
  }

  // ── Lote ──
  let lote: number | null = null;
  const mL = endereco.match(LOTE_REGEX);
  if (mL) lote = parseInt(mL[1], 10);

  // ── Formato alternativo N/M ou N-M para quadra/lote ──
  if ((quadra === null && quadraLetra === null) || lote === null) {
    const alt = endereco.match(ALT_QL_REGEX);
    if (alt) {
      if (quadra === null && quadraLetra === null) quadra = parseInt(alt[1], 10);
      if (lote === null) lote = parseInt(alt[2], 10);
    }
  }

  // ── Rua interna citada ──
  let ruaCitada: string | null = null;
  for (const r of condo.ruas) {
    const nomes = [r.nome, r.apelido].filter(Boolean) as string[];
    for (const n of nomes) {
      if (norm.includes(normalize(n))) { ruaCitada = r.nome; break; }
    }
    if (ruaCitada) break;
  }

  // ── Condomínio citado ──
  const condoCitado = condoCitadoNorm(norm, condo);

  return { quadra, quadraLetra, lote, ruaCitada, condoCitado, isLoja, enderecoOriginal: endereco };
}

// ─── Lookup de quadra (numérica ou por letra) ────────────────────────────────

function findQuadra(condo: CondoMap, parsed: ParsedAddress): Quadra | null {
  if (parsed.quadra !== null) {
    return condo.quadras.find((q) => q.numero === parsed.quadra) ?? null;
  }
  if (parsed.quadraLetra !== null) {
    const letra = parsed.quadraLetra.toUpperCase();
    return condo.quadras.find(
      (q) => q.letra?.toUpperCase() === letra || q.letra?.toUpperCase().replace(/[^A-Z0-9]/g, "") === letra,
    ) ?? null;
  }
  return null;
}

function resolvedQuadraNum(q: Quadra): number | null {
  return q.numero ?? null;
}

function resolvedQuadraLetra(q: Quadra): string | null {
  return q.letra ?? null;
}

// ─── Distância ───────────────────────────────────────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Instruções de navegação ─────────────────────────────────────────────────

function quadraLabel(q: Quadra): string {
  if (q.letra) return `Quadra ${q.letra}`;
  if (q.numero !== undefined) return `Quadra ${q.numero}`;
  return "Quadra ?";
}

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

// ─── Construção de rota ───────────────────────────────────────────────────────

export function buildRoute(
  rows: { linha: number; endereco: string }[],
  condo: CondoMap,
): RouteResult {
  const t0 = Date.now();
  const detalhes: DeliveryRow[] = [];
  const orderable: { row: DeliveryRow; quadra: Quadra }[] = [];

  for (const r of rows) {
    const parsed = parseEndereco(r.endereco, condo);

    // ── Loja / comércio (Rua das Pacas) ──
    if (parsed.isLoja) {
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: null,
        quadraLetra: null,
        lote: parsed.lote,
        classificacao: "loja",
        motivo: "Comércio/loja identificado na Rua Das Pacas (acesso direto, sem roteamento interno).",
      });
      continue;
    }

    // ── Sem quadra nem lote → nuance ──
    const semQuadra = parsed.quadra === null && parsed.quadraLetra === null;
    const semLote   = parsed.lote === null;

    if (semQuadra || semLote) {
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: parsed.quadra,
        quadraLetra: parsed.quadraLetra,
        lote: parsed.lote,
        classificacao: "nuance",
        motivo: semQuadra && semLote
          ? "Endereço incompleto: quadra e lote não informados."
          : semQuadra
          ? "Quadra não informada no endereço."
          : "Lote não informado no endereço.",
      });
      continue;
    }

    // ── Lookup no mapa interno ──
    const quadra = findQuadra(condo, parsed);
    if (!quadra) {
      const ref = parsed.quadraLetra ?? `${parsed.quadra}`;
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: parsed.quadra,
        quadraLetra: parsed.quadraLetra,
        lote: parsed.lote,
        classificacao: "nuance",
        motivo: `Quadra "${ref}" não consta no mapa interno do condomínio.`,
      });
      continue;
    }

    const row: DeliveryRow = {
      linha: r.linha,
      enderecoOriginal: r.endereco,
      quadra: resolvedQuadraNum(quadra),
      quadraLetra: resolvedQuadraLetra(quadra),
      lote: parsed.lote,
      classificacao: parsed.condoCitado ? "ordenada" : "encontrada_sem_condominio",
      motivo: parsed.condoCitado
        ? "Endereço completo com condomínio informado."
        : `Endereço encontrado, mas o nome do condomínio (${condo.nome}) não foi mencionado.`,
    };
    orderable.push({ row, quadra });
  }

  // ── Nearest-neighbor a partir da entrada ──
  const visited = new Array(orderable.length).fill(false);
  let cursor: { x: number; y: number } = condo.entrada;
  const sequence: { row: DeliveryRow; quadra: Quadra }[] = [];

  while (sequence.length < orderable.length) {
    let bestIdx = -1, bestScore = Infinity;
    for (let i = 0; i < orderable.length; i++) {
      if (visited[i]) continue;
      const d = dist(cursor, orderable[i].quadra);
      const tieBreaker = orderable[i].row.lote ?? 0;
      const score = d * 1000 + tieBreaker;
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    visited[bestIdx] = true;
    sequence.push(orderable[bestIdx]);
    cursor = orderable[bestIdx].quadra;
  }

  let prev: { x: number; y: number } = condo.entrada;
  for (let i = 0; i < sequence.length; i++) {
    const cur = sequence[i];
    const nxt = sequence[i + 1] ?? null;
    cur.row.ordem = i + 1;
    cur.row.instrucao = i === 0
      ? `Saindo da portaria, siga até ${quadraLabel(cur.quadra)} (Lote ${cur.row.lote}).`
      : instructionFor(prev, cur.quadra, nxt?.quadra ?? null) + ` Lote ${cur.row.lote}.`;
    detalhes.push(cur.row);
    prev = cur.quadra;
  }

  detalhes.sort((a, b) => {
    if (a.ordem && b.ordem) return a.ordem - b.ordem;
    if (a.ordem && !b.ordem) return -1;
    if (!a.ordem && b.ordem) return 1;
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

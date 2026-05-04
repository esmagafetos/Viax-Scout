/**
 * @file parser-test.mts
 * @description
 * Suíte de testes do motor semântico de parse de endereços.
 *
 * Execução:
 *   npx tsx artifacts/api-server/src/lib/condo-maps/__tests__/parser-test.mts
 *
 * Organização:
 *   GRUPO A — Padrões de quadra canônicos (keyword completa)
 *   GRUPO B — Padrões de quadra abreviados (qd, qu, qda)
 *   GRUPO C — Quadra forma mínima (Q isolado)
 *   GRUPO D — Quadra por letra / alfanumérica
 *   GRUPO E — Ordem invertida (lote antes da quadra)
 *   GRUPO F — Lote em formatos variados
 *   GRUPO G — Endereços reais da planilha (Nova Califórnia / Gravatá II)
 *   GRUPO H — Endereços reais da planilha (outros bairros — padrões extrapolados)
 *   GRUPO I — Detecção de loja / comércio
 *   GRUPO J — Endereços incompletos / nuance
 *   GRUPO K — Aliases de condomínio
 *   GRUPO L — Roteamento completo (buildRoute)
 */

import { parseEndereco, buildRoute, getCondo } from "../index.js";
import type { ParsedAddress } from "../types.js";
import { GRAVATA_II } from "../gravata-ii.js";
import { BOUGAINVILLE_III } from "../bougainville-iii.js";

// ─── Runner ───────────────────────────────────────────────────────────────────

const RESET  = "\x1b[0m";
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

interface TestCase {
  desc: string;
  endereco: string;
  condo: typeof GRAVATA_II;
  expect: Partial<{
    quadra: number | null;
    quadraLetra: string | null;
    lote: number | null;
    loteId: string | null;
    isLoja: boolean;
    condoCitado: boolean;
    ruaCitada: string | null;
    confiancaMin: number;  // confiança mínima esperada
  }>;
}

let passed = 0, failed = 0, total = 0;
const failures: string[] = [];

function runTest(tc: TestCase): void {
  total++;
  const parsed = parseEndereco(tc.endereco, tc.condo);
  const errs: string[] = [];

  for (const [key, expected] of Object.entries(tc.expect) as [keyof typeof tc.expect, any][]) {
    if (key === "confiancaMin") {
      if (parsed.confianca < expected) {
        errs.push(`  confianca=${parsed.confianca} < esperado mínimo ${expected}`);
      }
      continue;
    }
    const actual = (parsed as any)[key];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errs.push(`  ${key}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
    }
  }

  if (errs.length === 0) {
    passed++;
    console.log(`${GREEN}✔${RESET} ${tc.desc}`);
    console.log(`  ${DIM}quadra=${JSON.stringify(parsed.quadra)} quadraLetra=${JSON.stringify(parsed.quadraLetra)} lote=${JSON.stringify(parsed.lote)} loteId=${JSON.stringify(parsed.loteId)} conf=${parsed.confianca}${RESET}`);
    const tokenLine = parsed.tokens.map(t => `[${t.padrao}:${t.valorBruto}(${Math.round(t.confianca*100)}%)]`).join(" ");
    console.log(`  ${DIM}tokens: ${tokenLine}${RESET}`);
  } else {
    failed++;
    const label = `${RED}✘${RESET} ${tc.desc}`;
    console.log(label);
    errs.forEach(e => console.log(`${RED}${e}${RESET}`));
    const tokenLine = parsed.tokens.map(t => `[${t.padrao}:${t.valorBruto}(${Math.round(t.confianca*100)}%)]`).join(" ");
    console.log(`  ${YELLOW}tokens: ${tokenLine}${RESET}`);
    failures.push(`${tc.desc}\n${errs.join("\n")}`);
  }
}

function group(name: string): void {
  console.log(`\n${BOLD}${CYAN}── ${name} ──${RESET}`);
}

// ─── GRUPO A: Quadra — keyword canônica "quadra" ─────────────────────────────

group("GRUPO A — Quadra: keyword canônica");

runTest({
  desc: 'A01: "Quadra 9, lote 03" — canônico simples',
  endereco: "Av Sideral casa 1, Qd 9, lote 03 beira da pista",
  condo: GRAVATA_II,
  expect: { quadra: 9, quadraLetra: null, lote: 3 },
});

runTest({
  desc: 'A02: "Quadra A Lote 3" — letra única canônica',
  endereco: "Rua Lana, 66, Quadra A Lote 3 Casa azul",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "A", lote: 3 },
});

runTest({
  desc: 'A03: "Quadra 33- Lote 8" — número com hífen antes lote',
  endereco: "Rua Lagosta Dourada 679. Quadra 33- Lote 8, 679",
  condo: GRAVATA_II,
  expect: { quadra: 33, lote: 8 },
});

runTest({
  desc: 'A04: "Quadra 46 lote 01" — padrão direto',
  endereco: "Avenida Espacial, S/N, Quadra 46 lote 01 casa 01",
  condo: GRAVATA_II,
  expect: { quadra: 46, lote: 1 },
});

runTest({
  desc: 'A05: "QUADRA 9 CASA 1" — todo caps',
  endereco: "Rua Hortencia LOTE 13 QUADRA 9 CASA 1, 011",
  condo: GRAVATA_II,
  expect: { quadra: 9, lote: 13 },
});

runTest({
  desc: 'A06: "Quadra13" — sem espaço após keyword',
  endereco: "Rua Copo de Leite, 0, Quadra13  lote 05 casa 02",
  condo: GRAVATA_II,
  expect: { quadra: 13, lote: 5 },
});

runTest({
  desc: 'A07: "quadra 23 casa 1" — ordem invertida (lote antes)',
  endereco: "Avenida Júpiter, S/N, Lote 9 quadra 23 casa 1",
  condo: GRAVATA_II,
  expect: { quadra: 23, lote: 9 },
});

runTest({
  desc: 'A08: "quadra 30" sem lote → nuance',
  endereco: "Rua Marte, Sn, Lote 13 quadra 30",
  condo: GRAVATA_II,
  expect: { quadra: 30, lote: 13 },
});

// ─── GRUPO B: Quadra — abreviada qd / qda / qu ────────────────────────────────

group("GRUPO B — Quadra: abreviada (qd, qda, qu)");

runTest({
  desc: 'B01: "Qd 20 lt2" — qd com espaço',
  endereco: "Rua Bromélia, 1, Qd 20 lt2",
  condo: GRAVATA_II,
  expect: { quadra: 20, lote: 2 },
});

runTest({
  desc: 'B02: "Qd.10" — qd com ponto sem espaço',
  endereco: "Rua Apolo Vinte e Um Lt.17 Qd.10 casa 01 Vista Alegre",
  condo: GRAVATA_II,
  expect: { quadra: 10, lote: 17 },
});

runTest({
  desc: 'B03: "QD16 LT.7" — sem espaço, uppercase',
  endereco: "Avenida Sideral, 09, QD16 LT.7 lado do dep. de gás",
  condo: GRAVATA_II,
  expect: { quadra: 16, lote: 7 },
});

runTest({
  desc: 'B04: "Qda 2 casa 3" — variante qda',
  endereco: "Avenida Litorânea, Lt 13, Qda 2 casa 3 próx vela do orla",
  condo: GRAVATA_II,
  expect: { quadra: 2, lote: 13 },
});

runTest({
  desc: 'B05: "Qu 18PD, LT4A" — qu + código alfanumérico + lote com letra',
  endereco: "Rua Lima Barreto Qu 18PD, LT4A, Ao lado da escola CEM MOTTA",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "18PD", lote: null, loteId: "4A" },
});

runTest({
  desc: 'B06: "Qd E Lt 11" — quadra por letra com qd abreviado',
  endereco: "Rua Namorado, 2, Qd E Lt 11",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "E", lote: 11 },
});

runTest({
  desc: 'B07: "qd 55 lt 17" (ordem invertida, lowercase)',
  endereco: "Rua Vinícius de Moraes, S/n, Casa lt 17 qd 55 unamar",
  condo: GRAVATA_II,
  expect: { quadra: 55, lote: 17 },
});

// ─── GRUPO C: Quadra — forma mínima Q ────────────────────────────────────────

group("GRUPO C — Quadra: forma mínima (Q, Q:, Q.)");

runTest({
  desc: 'C01: "Q 01" com lote "L:10"',
  endereco: "Av. Sideral, 0, L:10 Q 01 LJ:01, Verão Vermelho",
  condo: GRAVATA_II,
  expect: { quadra: 1, lote: 10 },
});

runTest({
  desc: 'C02: "Q. J" — Q ponto espaço letra',
  endereco: "Avenida 1 - vivamar Lote 9 Q. J",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "J", lote: 9 },
});

runTest({
  desc: 'C03: "Q24" — Q colado a número (sem espaço)',
  endereco: "Rua Azaléia, Q24, Quadra 24lote 01",
  condo: GRAVATA_II,
  expect: { quadra: 24, lote: 1 },
});

// ─── GRUPO D: Quadra alfanumérica ─────────────────────────────────────────────

group("GRUPO D — Quadra: identificadores alfanuméricos");

runTest({
  desc: 'D01: "quadra A" — letra única',
  endereco: "Gravatá II, quadra A, lote 3",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "A", lote: 3, condoCitado: true },
});

runTest({
  desc: 'D02: "quadra F1 lote 2" — letra+número',
  endereco: "quadra F1 lote 2 gravatá 2",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "F1", lote: 2, condoCitado: true },
});

runTest({
  desc: 'D03: "quadra 3APF" — código especial',
  endereco: "Gravatá II, quadra 3APF, lote 1",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "3APF", lote: 1 },
});

runTest({
  desc: 'D04: "Qd B1 lote 4" — B1 presente no mapa',
  endereco: "Rua Coqueirais Qd B1 lote 4",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "B1", lote: 4 },
});

runTest({
  desc: 'D05: "Qd 1B" — sequência numérico+letra',
  endereco: "Av. Geovani Marcos, Qd 1B, lote 7",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: "1B", lote: 7 },
});

// ─── GRUPO E: Ordem invertida (lote antes da quadra) ─────────────────────────

group("GRUPO E — Ordem invertida");

runTest({
  desc: 'E01: "Lote 11 Quadra 08"',
  endereco: "Rua Marte, 0, Lote 11 Quadra 08 Casa 03",
  condo: GRAVATA_II,
  expect: { quadra: 8, lote: 11 },
});

runTest({
  desc: 'E02: "Lote 5 quadra 9"',
  endereco: "Rua dos Antúrios, S/N, Lote 5 quadra 9",
  condo: GRAVATA_II,
  expect: { quadra: 9, lote: 5 },
});

runTest({
  desc: 'E03: "Lote 17 quadra 3"',
  endereco: "Rua das Orquídeas, Lote, Lote 17 quadra 3",
  condo: GRAVATA_II,
  expect: { quadra: 3, lote: 17 },
});

runTest({
  desc: 'E04: "Lote 09 Quadra 14"',
  endereco: "Rua Camélia, 09, Lote 09 Quadra 14 Casa 02",
  condo: GRAVATA_II,
  expect: { quadra: 14, lote: 9 },
});

// ─── GRUPO F: Lote — variações de formato ────────────────────────────────────

group("GRUPO F — Lote: variações de formato");

runTest({
  desc: 'F01: "L:10" — formato colon',
  endereco: "Av. Sideral, 0, L:10 Q 01",
  condo: GRAVATA_II,
  expect: { lote: 10 },
});

runTest({
  desc: 'F02: "LT4A" — lote alfanumérico',
  endereco: "Rua Lima Barreto Qu 18PD, LT4A",
  condo: GRAVATA_II,
  expect: { lote: null, loteId: "4A" },
});

runTest({
  desc: 'F03: "Lt.17" — lt ponto número',
  endereco: "Rua Apolo Vinte e Um Lt.17 Qd.10",
  condo: GRAVATA_II,
  expect: { lote: 17 },
});

runTest({
  desc: 'F04: "lt2" — lt colado ao número',
  endereco: "Rua Bromélia, 1, Qd 20 lt2",
  condo: GRAVATA_II,
  expect: { lote: 2 },
});

runTest({
  desc: 'F05: "LT.7" — lt ponto número uppercase',
  endereco: "Avenida Sideral, 09, QD16 LT.7",
  condo: GRAVATA_II,
  expect: { lote: 7 },
});

runTest({
  desc: 'F06: "L 04" — L isolado com espaço',
  endereco: "Rua das Samambaias, L 04, Quadra 27",
  condo: GRAVATA_II,
  expect: { quadra: 27, lote: 4 },
});

runTest({
  desc: 'F07: "Lt 13" — lt com espaço',
  endereco: "Avenida Litorânea, Lt 13, Qda 2 casa 3",
  condo: GRAVATA_II,
  expect: { lote: 13, quadra: 2 },
});

runTest({
  desc: 'F08: "L5Q5" — formato compacto (Rua Lunar)',
  endereco: "Rua Lunar, L5Q5, Entrada 3 .Verão Vermelho",
  condo: GRAVATA_II,
  expect: { quadra: 5, lote: 5 },
});

// ─── GRUPO G: Endereços reais — Nova Califórnia / Gravatá II ─────────────────

group("GRUPO G — Endereços reais: Nova Califórnia (planilha Ayslane)");

runTest({
  desc: 'G01 [ROW98]: "Rua Lima Barreto Qu 18PD, LT4A, CEM MOTTA" (bairro Nova Cal)',
  endereco: "Rua Lima Barreto Qu 18PD, LT4A, Ao lado da escola CEM MOTTA",
  condo: GRAVATA_II,
  expect: { quadraLetra: "18PD", lote: null, loteId: "4A", ruaCitada: "Rua Lima Barreto" },
});

runTest({
  desc: 'G02: Endereço com alias do condomínio no texto',
  endereco: "Rua Lima Barreto, Qd A1, lote 5, Gravatá 2",
  condo: GRAVATA_II,
  expect: { quadraLetra: "A1", lote: 5, condoCitado: true },
});

runTest({
  desc: 'G03: Rua Av. Geovani Marcos, quadra numérica, lote',
  endereco: "Av. Geovani Marcos, Quadra 29, lote 3, Gravatá II",
  condo: GRAVATA_II,
  expect: { quadra: 29, lote: 3, condoCitado: true, ruaCitada: "Av. Geovani Marcos" },
});

runTest({
  desc: 'G04: Rua Pau Brasil, quadra letra Z',
  endereco: "Rua Pau Brasil, Quadra Z, lote 2",
  condo: GRAVATA_II,
  expect: { quadraLetra: "Z", lote: 2, ruaCitada: "Rua Pau Brasil" },
});

runTest({
  desc: 'G05: Quadra 56, lote 4 (quadra numérica presente no mapa)',
  endereco: "Qd 56 lt 4 Gravatá II",
  condo: GRAVATA_II,
  expect: { quadra: 56, lote: 4, condoCitado: true },
});

runTest({
  desc: 'G06: Quadra H1 lote 9 (presente no mapa)',
  endereco: "Rua Das Estrelas Qd H1 lote 9 gravata 2",
  condo: GRAVATA_II,
  expect: { quadraLetra: "H1", lote: 9, condoCitado: true },
});

// ─── GRUPO H: Endereços reais — outros bairros (padrões extrapolados) ─────────

group("GRUPO H — Endereços reais: outros bairros (padrões compartilhados)");

runTest({
  desc: 'H01 [ROW3]: "Qd 9, lote 03"',
  endereco: "Av Sideral casa 1, Qd 9, lote 03 beira da pista",
  condo: GRAVATA_II,
  expect: { quadra: 9, lote: 3 },
});

runTest({
  desc: 'H02 [ROW5]: "L:10 Q 01 LJ:01"',
  endereco: "Av. Sideral, 0, L:10 Q 01 LJ:01, Verão Vermelho",
  condo: GRAVATA_II,
  expect: { quadra: 1, lote: 10 },
});

runTest({
  desc: 'H03 [ROW36]: "lt 17 qd 55" (ordem invertida)',
  endereco: "Rua Vinícius de Moraes, S/n, Casa lt 17 qd 55 unamar",
  condo: GRAVATA_II,
  expect: { quadra: 55, lote: 17 },
});

runTest({
  desc: 'H04 [ROW93]: "Lt.17 Qd.10" (dots)',
  endereco: "Rua Apolo Vinte e Um Lt.17 Qd.10 casa 01 Vista Alegre, 0000",
  condo: GRAVATA_II,
  expect: { quadra: 10, lote: 17 },
});

runTest({
  desc: 'H05 [ROW101]: "Qd E Lt 11" (letter quadra)',
  endereco: "Rua Namorado, 2, Qd E Lt 11",
  condo: GRAVATA_II,
  expect: { quadraLetra: "E", lote: 11 },
});

runTest({
  desc: 'H06 [ROW107]: "Qda 2, Lt 13" (variante qda)',
  endereco: "Avenida Litorânea, Lt 13, Qda 2 casa 3 próx vela do orla",
  condo: GRAVATA_II,
  expect: { quadra: 2, lote: 13 },
});

runTest({
  desc: 'H07 [ROW139]: "LOTE 13 QUADRA 9" (invertido, caps)',
  endereco: "Rua Hortencia LOTE 13 QUADRA 9 CASA 1, 011, Condominio TerraMar",
  condo: GRAVATA_II,
  expect: { quadra: 9, lote: 13 },
});

runTest({
  desc: 'H08 [ROW148]: "Qd 20 lt2" (lt colado)',
  endereco: "Rua Bromélia, 1, Qd 20 lt2",
  condo: GRAVATA_II,
  expect: { quadra: 20, lote: 2 },
});

runTest({
  desc: 'H09 [ROW159]: "Lote 9 Q. J" (Q. letra)',
  endereco: "Avenida 1 - vivamar Lote 9 Q. J",
  condo: GRAVATA_II,
  expect: { quadraLetra: "J", lote: 9 },
});

runTest({
  desc: 'H10 [ROW120]: "lote 12 quadra 5"',
  endereco: "Rua Almirante Tamandaré, 12, lote 12 quadra 5",
  condo: GRAVATA_II,
  expect: { quadra: 5, lote: 12 },
});

// ─── GRUPO I: Detecção de loja / comércio ────────────────────────────────────

group("GRUPO I — Detecção de loja");

runTest({
  desc: 'I01: Rua das Pacas + "farmácia" → isLoja=true',
  endereco: "Rua das Pacas, lote 5, loja farmácia",
  condo: GRAVATA_II,
  expect: { isLoja: true },
});

runTest({
  desc: 'I02: Rua das Pacas + "mercado" → isLoja=true',
  endereco: "Rua Das Pacas, 10, Mercado Central",
  condo: GRAVATA_II,
  expect: { isLoja: true },
});

runTest({
  desc: 'I03: Sem Rua das Pacas + "bar" → isLoja=false',
  endereco: "Rua do Amor, 42, Depósito de Bebidas ReT",
  condo: GRAVATA_II,
  expect: { isLoja: false },
});

runTest({
  desc: 'I04: Rua das Pacas sem keyword de loja → isLoja=false',
  endereco: "Rua das Pacas, Quadra A, lote 3",
  condo: GRAVATA_II,
  expect: { isLoja: false },
});

// ─── GRUPO J: Endereços incompletos (nuance) ──────────────────────────────────

group("GRUPO J — Endereços incompletos / sem quadra");

runTest({
  desc: 'J01: Sem quadra nem lote → ambos null',
  endereco: "Rua Sinagoga, 45, Depois do bar do Biel",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: null, lote: null, loteId: null },
});

runTest({
  desc: 'J02: Tem quadra, sem lote',
  endereco: "Avenida Litorânea, 10, Quadra 27 casa 2 Fundos",
  condo: GRAVATA_II,
  expect: { quadra: 27, lote: null, loteId: null },
});

runTest({
  desc: 'J03: S/N não deve ser interpretado como lote',
  endereco: "Rua Vinícius de Moraes, S/n, Unamar (sem quadra/lote explícitos)",
  condo: GRAVATA_II,
  expect: { quadra: null, lote: null },
});

runTest({
  desc: 'J04: Número da rua (09) não deve virar quadra (sem keyword)',
  endereco: "Avenida Sideral, 09, lado do dep. de gás",
  condo: GRAVATA_II,
  expect: { quadra: null, quadraLetra: null, lote: null },
});

// ─── GRUPO K: Aliases de condomínio ───────────────────────────────────────────

group("GRUPO K — Aliases de condomínio");

runTest({
  desc: 'K01: "gravatá 2" → condoCitado=true',
  endereco: "Qd 29 lote 5 gravatá 2",
  condo: GRAVATA_II,
  expect: { condoCitado: true },
});

runTest({
  desc: 'K02: "Gravatá II" → condoCitado=true',
  endereco: "Av. Geovani Marcos, Quadra 56, lote 7, Gravatá II",
  condo: GRAVATA_II,
  expect: { condoCitado: true },
});

runTest({
  desc: 'K03: "sítio gravatá 2" → condoCitado=true',
  endereco: "Rua Lima Barreto Qu 18PD, LT4A, Nova Califórnia Sítio Gravatá 2",
  condo: GRAVATA_II,
  expect: { condoCitado: true },
});

runTest({
  desc: 'K04: "bougainville" → condoCitado=true para BOUG III',
  endereco: "Quadra 15, lote 3, Bougainville",
  condo: BOUGAINVILLE_III,
  expect: { condoCitado: true, quadra: 15, lote: 3 },
});

runTest({
  desc: 'K05: Sem menção ao condo → condoCitado=false',
  endereco: "Qd A lote 2 Nova Califórnia",
  condo: GRAVATA_II,
  expect: { condoCitado: false },
});

// ─── GRUPO L: buildRoute — roteamento completo ────────────────────────────────

group("GRUPO L — buildRoute: roteamento completo");

{
  const rows = [
    { linha: 1, endereco: "Av. Geovani Marcos, Qd A, lote 3, Gravatá II" },
    { linha: 2, endereco: "Qd B lote 5 Gravatá 2" },
    { linha: 3, endereco: "Rua Das Pacas, loja farmácia" },
    { linha: 4, endereco: "Qd 29 lote 7 gravatá ii" },
    { linha: 5, endereco: "Sem endereço válido nenhum" },
  ];
  const result = buildRoute(rows, GRAVATA_II);

  total++;
  const errors: string[] = [];
  if (result.totalLojas !== 1) errors.push(`totalLojas=${result.totalLojas} want 1`);
  if (result.totalNuances !== 1) errors.push(`totalNuances=${result.totalNuances} want 1`);
  if (result.totalLinhas !== 5) errors.push(`totalLinhas=${result.totalLinhas} want 5`);
  const roteadas = result.totalOrdenadas + result.totalSemCondominio;
  if (roteadas < 2) errors.push(`roteadas=${roteadas} want ≥2`);
  if (!result.detalhes.find(d => d.classificacao === "loja")) errors.push("missing loja");
  if (!result.detalhes.find(d => d.classificacao === "nuance")) errors.push("missing nuance");
  const sequencia = result.detalhes.filter(d => d.ordem !== undefined).sort((a,b) => (a.ordem!-b.ordem!));
  if (sequencia.length > 0 && !sequencia[0].instrucao?.includes("portaria")) errors.push("primeira instrução deve mencionar portaria");

  if (errors.length === 0) {
    passed++;
    console.log(`${GREEN}✔${RESET} L01: buildRoute — 5 linhas → loja+nuance+roteadas`);
    console.log(`  ${DIM}totalOrdenadas=${result.totalOrdenadas} semCondo=${result.totalSemCondominio} nuances=${result.totalNuances} lojas=${result.totalLojas} ms=${result.metricas.tempo_ms}${RESET}`);
    sequencia.forEach(d => console.log(`  ${DIM}#${d.ordem} [${d.classificacao}] ${d.instrucao}${RESET}`));
  } else {
    failed++;
    console.log(`${RED}✘${RESET} L01: buildRoute — 5 linhas`);
    errors.forEach(e => console.log(`${RED}  ${e}${RESET}`));
    failures.push("L01: buildRoute\n" + errors.join("\n"));
  }
}

{
  // Roteamento com endereços em ordem aleatória — verificar que nearest-neighbor funciona
  const rows = [
    { linha: 1, endereco: "Qd R lote 1 Gravatá II" },  // x=31, y=44 (oeste)
    { linha: 2, endereco: "Qd A lote 2 Gravatá II" },  // x=95, y=47 (leste — próx portaria)
    { linha: 3, endereco: "Qd 60 lote 3 Gravatá II" }, // x=41, y=39 (oeste)
  ];
  const result = buildRoute(rows, GRAVATA_II);
  total++;
  // Esperamos que Qd A (mais próxima da portaria em x=96) seja visitada primeiro
  const seq = result.detalhes.filter(d => d.ordem !== undefined).sort((a,b) => a.ordem!-b.ordem!);
  const primeiraLetra = seq[0]?.quadraLetra ?? seq[0]?.quadra;
  const ok = primeiraLetra === "A";
  if (ok) {
    passed++;
    console.log(`${GREEN}✔${RESET} L02: nearest-neighbor — Qd A deve ser a 1ª (mais próxima da portaria)`);
    console.log(`  ${DIM}sequência: ${seq.map(d => d.quadraLetra ?? d.quadra).join(" → ")}${RESET}`);
  } else {
    failed++;
    console.log(`${RED}✘${RESET} L02: nearest-neighbor — esperado 1ª=A, got ${primeiraLetra}`);
    console.log(`  ${YELLOW}sequência: ${seq.map(d => d.quadraLetra ?? d.quadra).join(" → ")}${RESET}`);
    failures.push("L02: nearest-neighbor — 1ª visita não foi Qd A");
  }
}

// ─── Relatório final ──────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
const rate = Math.round((passed / total) * 100);
const color = rate === 100 ? GREEN : rate >= 80 ? YELLOW : RED;
console.log(`${BOLD}${color}Resultado: ${passed}/${total} (${rate}%)${RESET}`);
if (failures.length > 0) {
  console.log(`\n${RED}${BOLD}Falhas (${failures.length}):${RESET}`);
  failures.forEach((f, i) => console.log(`${i+1}. ${f}`));
}
process.exit(failed > 0 ? 1 : 0);

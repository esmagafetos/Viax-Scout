import type { CondoMap } from "./types.js";

/**
 * Mapa do Condomínio Gravatá II — Nova Califórnia (Tamoios/Cabo Frio-RJ)
 * Administração: Roberto Rosário
 * CEP base: 28927-503
 *
 * Forma: triângulo irregular com:
 *   - Vértice OESTE (ápice): extremo esquerdo, ponta afilada
 *   - Base LESTE: ao longo da Rua Das Pacas (estrada externa pública)
 *   - Borda NORTE: diagonal da ponta à base (noroeste → nordeste)
 *   - Borda SUL: diagonal da ponta à base (sudoeste → sudeste)
 *
 * Coordenadas normalizadas 0–100:
 *   x: oeste/ápice (0) → leste/Rua Das Pacas (100)
 *   y: norte (0) → sul (100)
 *
 * Portaria: lado leste (Rua Das Pacas), na altura média do condomínio (~y=50),
 * entre os blocos 1 e 18.
 *
 * Vias internas identificadas no mapa oficial:
 *   Horizontais (leste↔oeste):
 *     - Rua André Terra           (CEP 28927-473) — banda norte
 *     - Rua Coqueirais            (CEP 28927-401/473) — norte-alto
 *     - Rua Das Oliveiras         (CEP 28927-473/479) — norte-médio
 *     - Rua João Ferreira         (CEP 28927-518) — noroeste
 *     - Av. Geovani Marcos        (CEP 28927-482) — central
 *     - Rua Das Estrelas          (CEP 28927-550/509) — central
 *     - Rua Pau Brasil            (CEP 28927-434) — sul-central
 *     - Av. Das Rosas             (CEP 28927-485) — leste-sul
 *     - Rua Nininhof              (CEP 28927-437) — leste-sul
 *     - Rua Elza Rodrigues        (CEP 28927-428) — sul
 *     - Av. Sérgio Ribeiro        (CEP 28927-806) — sul
 *   Verticais / diagonais:
 *     - Av. Gravatá               (CEP 28927-488/339) — borda sul diagonal
 *     - Rua Francisco de Assis    (CEP 28927-401)
 *     - Rua Marcos Correia        (CEP 28927-401)
 *     - Rua Zélia Goiaf           (CEP 28927-401)
 *     - Rua Carvalho Faustino
 *     - Rua Maracanã
 *     - Rua Flamboyant
 *     - Rua Vinícius de Moraes
 *     - Rua Mambiran Lobato
 *     - Rua Cecília Meireles
 *     - Rua Etêrnio Ferreira
 *     - Rua Lérica
 *     - Rua Douragal
 *     - Rua José                  (CEP 28927-419)
 *     - Rua Uma Barrei
 *
 * Quadras: mistas — letras simples (A–Z), duplas (A1–H1) e números
 * (1, 2, 3, 18, 29, 56, 58, 59, 60 + especiais PD, PF, APF, PCE).
 */
export const GRAVATA_II: CondoMap = {
  id: "gravata-ii",
  nome: "Gravatá II",
  status: "ativo",
  totalLotes: undefined,
  entrada: { x: 96, y: 51, rotuloEntrada: "Portaria — Rua Das Pacas" },
  ruas: [
    { id: "rua-das-pacas",        nome: "Rua Das Pacas",          apelido: "Rua das Pacas" },
    { id: "andre-terra",          nome: "Rua André Terra" },
    { id: "coqueirais",           nome: "Rua Coqueirais" },
    { id: "das-oliveiras",        nome: "Rua Das Oliveiras" },
    { id: "joao-ferreira",        nome: "Rua João Ferreira" },
    { id: "geovani-marcos",       nome: "Av. Geovani Marcos",     apelido: "Rua Geovani Marcos" },
    { id: "das-estrelas",         nome: "Rua Das Estrelas" },
    { id: "av-gravata",           nome: "Av. Gravatá",            apelido: "Avenida Gravatá" },
    { id: "pau-brasil",           nome: "Rua Pau Brasil" },
    { id: "carvalho-faustino",    nome: "Rua Carvalho Faustino" },
    { id: "das-rosas",            nome: "Av. Das Rosas",          apelido: "Rua Das Rosas" },
    { id: "nininhof",             nome: "Rua Nininhof" },
    { id: "elza-rodrigues",       nome: "Rua Elza Rodrigues" },
    { id: "sergio-ribeiro",       nome: "Av. Sérgio Ribeiro" },
    { id: "marcos-correia",       nome: "Rua Marcos Correia" },
    { id: "francisco-assis",      nome: "Rua Francisco de Assis" },
    { id: "zelia-goiaf",          nome: "Rua Zélia Goiaf",        apelido: "Rua Zélia" },
    { id: "maracana",             nome: "Rua Maracanã" },
    { id: "flamboyant",           nome: "Rua Flamboyant" },
    { id: "vinicius-moraes",      nome: "Rua Vinícius de Moraes" },
    { id: "mambiran-lobato",      nome: "Rua Mambiran Lobato" },
    { id: "cecilia-meireles",     nome: "Rua Cecília Meireles" },
    { id: "eternio-ferreira",     nome: "Rua Etêrnio Ferreira" },
    { id: "lerica",               nome: "Rua Lérica" },
    { id: "douragal",             nome: "Rua Douragal" },
    { id: "jose",                 nome: "Rua José" },
    // "Rua Lima Barreto" — confirmado no dataset real (planilha Ayslane, ROW98/102/205/206/207).
    // A grafia "Uma Barrei" em versões anteriores era erro de leitura do mapa físico.
    { id: "lima-barreto",         nome: "Rua Lima Barreto",      apelido: "R. Lima Barreto" },
  ],
  quadras: [
    // ─────────────────────────────────────────────────────────────────────
    // COLUNA LESTE — borda com Rua Das Pacas (x≈96-98)
    // Norte (topo) → Sul (base)
    // ─────────────────────────────────────────────────────────────────────
    { id: "qW-leste",  letra: "W",   x: 97, y: 4  },
    { id: "qX-leste",  letra: "X",   x: 97, y: 11 },
    { id: "qV-leste",  letra: "V",   x: 97, y: 19 },
    { id: "qU-leste",  letra: "U",   x: 97, y: 27 },
    { id: "qT-leste",  letra: "T",   x: 97, y: 35 },
    { id: "qS-leste",  letra: "S",   x: 97, y: 42 },
    // Blocos numerados leste (portaria entre q1 e q18)
    { id: "q1",        numero: 1,    x: 96, y: 51 },
    { id: "q1b",       letra: "1B",  x: 94, y: 56 },
    { id: "q18",       numero: 18,   x: 91, y: 61 },
    { id: "q2",        numero: 2,    x: 96, y: 68 },
    { id: "q3",        numero: 3,    x: 96, y: 77 },
    { id: "q3apf",     letra: "3APF",x: 93, y: 84 },

    // ─────────────────────────────────────────────────────────────────────
    // BANDA NORTE — entre Rua André Terra e Rua Coqueirais (y≈4-14)
    // ─────────────────────────────────────────────────────────────────────
    { id: "qC1",       letra: "C1",  x: 79, y: 7  },
    { id: "qB1",       letra: "B1",  x: 86, y: 12 },

    // ─────────────────────────────────────────────────────────────────────
    // SEGUNDA BANDA NORTE — entre Coqueirais e Oliveiras (y≈14-25)
    // ─────────────────────────────────────────────────────────────────────
    { id: "qA1",       letra: "A1",  x: 91, y: 20 },
    { id: "qD1",       letra: "D1",  x: 67, y: 17 },

    // ─────────────────────────────────────────────────────────────────────
    // BANDA OLIVEIRAS-GEOVANI — (y≈25-38)
    // ─────────────────────────────────────────────────────────────────────
    { id: "qE1",       letra: "E1",  x: 74, y: 24 },
    { id: "qF1",       letra: "F1",  x: 70, y: 31 },
    { id: "qG1",       letra: "G1",  x: 57, y: 31 },
    { id: "qH1",       letra: "H1",  x: 46, y: 35 },
    { id: "q60",       numero: 60,   x: 41, y: 39 },
    { id: "q59",       numero: 59,   x: 52, y: 39 },
    { id: "q58",       numero: 58,   x: 62, y: 41 },

    // ─────────────────────────────────────────────────────────────────────
    // BANDA GEOVANI-ESTRELAS — central (y≈38-50)
    // ─────────────────────────────────────────────────────────────────────
    { id: "qZ-cen",    letra: "Z",   x: 84, y: 36 },
    { id: "q29",       numero: 29,   x: 84, y: 43 },
    { id: "q56",       numero: 56,   x: 73, y: 43 },

    // Fila principal de letras (leste→oeste), y≈46
    { id: "qA",        letra: "A",   x: 95, y: 47 },
    { id: "qB",        letra: "B",   x: 92, y: 47 },
    { id: "qC",        letra: "C",   x: 89, y: 47 },
    { id: "qD",        letra: "D",   x: 86, y: 47 },
    { id: "qE",        letra: "E",   x: 83, y: 47 },
    { id: "qF",        letra: "F",   x: 79, y: 47 },
    { id: "qG",        letra: "G",   x: 75, y: 47 },
    { id: "qH",        letra: "H",   x: 71, y: 47 },
    { id: "qI",        letra: "I",   x: 67, y: 47 },
    { id: "qJ",        letra: "J",   x: 63, y: 47 },
    { id: "qK",        letra: "K",   x: 59, y: 46 },
    { id: "qL",        letra: "L",   x: 55, y: 46 },
    { id: "qM",        letra: "M",   x: 51, y: 46 },
    { id: "qN",        letra: "N",   x: 47, y: 46 },
    { id: "qO",        letra: "O",   x: 43, y: 46 },
    { id: "qP",        letra: "P",   x: 39, y: 45 },
    { id: "qQ",        letra: "Q",   x: 35, y: 44 },
    { id: "qR",        letra: "R",   x: 31, y: 44 },

    // ─────────────────────────────────────────────────────────────────────
    // BANDA PAU BRASIL — (y≈53-62)
    // ─────────────────────────────────────────────────────────────────────
    // Sub-faixa leste
    { id: "qA-pb",     letra: "A",   x: 94, y: 55 },
    { id: "qB-pb",     letra: "B",   x: 91, y: 55 },
    { id: "qC-pb",     letra: "C",   x: 88, y: 55 },
    { id: "qD-pb",     letra: "D",   x: 85, y: 55 },
    // Série W/X/Y/Z interior
    { id: "qZ-pb",     letra: "Z",   x: 85, y: 59 },
    { id: "qW-pb",     letra: "W",   x: 80, y: 59 },
    { id: "qY-pb",     letra: "Y",   x: 75, y: 59 },
    { id: "qX-pb",     letra: "X",   x: 70, y: 59 },
    { id: "qV-pb",     letra: "V",   x: 65, y: 59 },
    { id: "qU-pb",     letra: "U",   x: 60, y: 59 },
    { id: "qT-pb",     letra: "T",   x: 55, y: 59 },
    { id: "qS-pb",     letra: "S",   x: 50, y: 59 },
    // Sub-fila E5..A1 (inferior desta banda)
    { id: "qA1-pb",    letra: "A1",  x: 79, y: 63 },
    { id: "qB2-pb",    letra: "B2",  x: 73, y: 63 },
    { id: "qC3-pb",    letra: "C3",  x: 67, y: 63 },
    { id: "qD4-pb",    letra: "D4",  x: 61, y: 63 },
    { id: "qE5-pb",    letra: "E5",  x: 55, y: 63 },

    // ─────────────────────────────────────────────────────────────────────
    // BANDA SUL — entre Rua Das Rosas e Av. Sérgio Ribeiro (y≈68-88)
    // ─────────────────────────────────────────────────────────────────────
    { id: "qV-sul",    letra: "V",   x: 89, y: 72 },
    { id: "qU-sul",    letra: "U",   x: 85, y: 72 },
    { id: "qT-sul",    letra: "T",   x: 81, y: 73 },
    { id: "qS-sul",    letra: "S",   x: 77, y: 74 },
    { id: "qA-sul",    letra: "A",   x: 93, y: 76 },
  ],
  observacoes:
    "Mapeamento extraído de fotografia do mapa físico oficial do Gravatá II. " +
    "Forma triangular: ápice a oeste, base a leste (Rua Das Pacas). " +
    "Quadras com letras simples (A–Z), duplas (A1–H1) e numeradas (1, 2, 3, 18, 29, 56, 58, 59, 60). " +
    "Administração: Roberto Rosário. Portaria: Rua Das Pacas, altura ~y=51.",
};

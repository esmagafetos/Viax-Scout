import type { CondoMap } from "./types.js";

/**
 * Mapa do Condomínio Residencial Bougainville III — 1086 lotes, 52 quadras.
 *
 * Coordenadas normalizadas 0-100:
 *   x: oeste (0) → leste (100)   — eixo horizontal do mapa
 *   y: norte (0) → sul (100)     — eixo vertical do mapa
 *
 * Forma: pentágono irregular com:
 *   - Faixa estreita NORTE-SUL no extremo leste (Q1–Q19, Q23, etc.)
 *   - Corpo principal central-sul (Q20–Q40)
 *   - Triângulo a NOROESTE (Q41–Q52)
 *
 * Vias internas (numeração "Rua Projetada N" + nomes oficiais):
 *   Horizontais (perímetro/spines, oeste↔leste):
 *     - Avenida do Bougainville Branco  (RP1)  — perímetro sul
 *     - Avenida do Bougainville Rosa    (RP2)  — paralela interna sul
 *     - Avenida do Bougainville Roxo    (RP3)  — spine central
 *     - Rua da Acácia                   (RP4)  — divisor do triângulo NW
 *     - Rua da Azaléia                  (RP6)  — divisor central-leste
 *     - Rua da Begônia                  (RP7)  — NE-mid
 *     - Rua da Bromélia                 (RP8)  — NE-mid alto
 *     - Rua da Camélia                  (RP9)  — NE alto
 *     - Rua do Cravo                    (RP10) — extremo norte (topo NE)
 *
 *   Verticais (norte↔sul):
 *     - Rua do Antúrio                  (RP5)  — entre triângulo e corpo central
 *     - Rua do Crisântemo               (RP12) — triângulo oeste
 *     - Rua das Flores                  (RP13) — triângulo oeste
 */
export const BOUGAINVILLE_III: CondoMap = {
  id: "bougainville-iii",
  nome: "Bougainville III",
  status: "ativo",
  totalLotes: 1086,
  entrada: { x: 99, y: 60, rotuloEntrada: "Portaria — Avenida do Bougainville Leste" },
  prevEntrada: { x: 109, y: 60 },
  ruas: [
    { id: "av-branco",     nome: "Avenida do Bougainville Branco", apelido: "Rua Projetada 1" },
    { id: "av-rosa",       nome: "Avenida do Bougainville Rosa",   apelido: "Rua Projetada 2" },
    { id: "av-roxo",       nome: "Avenida do Bougainville Roxo",   apelido: "Rua Projetada 3" },
    { id: "rp4-acacia",    nome: "Rua da Acácia",                  apelido: "Rua Projetada 4" },
    { id: "rp5-anturio",   nome: "Rua do Antúrio",                 apelido: "Rua Projetada 5" },
    { id: "rp6-azaleia",   nome: "Rua da Azaléia",                 apelido: "Rua Projetada 6" },
    { id: "rp7-begonia",   nome: "Rua da Begônia",                 apelido: "Rua Projetada 7" },
    { id: "rp8-bromelia",  nome: "Rua da Bromélia",                apelido: "Rua Projetada 8" },
    { id: "rp9-camelia",   nome: "Rua da Camélia",                 apelido: "Rua Projetada 9" },
    { id: "rp10-cravo",    nome: "Rua do Cravo",                   apelido: "Rua Projetada 10" },
    { id: "rp11-dalia",    nome: "Rua da Dália",                   apelido: "Rua Projetada 11" },
    { id: "rp12-crisantemo", nome: "Rua do Crisântemo",            apelido: "Rua Projetada 12" },
    { id: "rp13-flores",   nome: "Rua das Flores",                 apelido: "Rua Projetada 13" },
    { id: "rp14-fresia",   nome: "Rua da Fresia",                  apelido: "Rua Projetada 14" },
    { id: "rp15-geranio",  nome: "Rua do Gerânio",                 apelido: "Rua Projetada 15" },
    { id: "rp16-gerbera",  nome: "Rua da Gérbera",                 apelido: "Rua Projetada 16" },
    { id: "rp17-girassol", nome: "Rua do Girassol",                apelido: "Rua Projetada 17" },
    { id: "rp18-hortensia", nome: "Rua da Hortênsia",              apelido: "Rua Projetada 18" },
    { id: "rp19-lirio",    nome: "Rua do Lírio",                   apelido: "Rua Projetada 19" },
    { id: "rp20-margarida", nome: "Rua da Margarida",              apelido: "Rua Projetada 20" },
    { id: "rp21-orquidea", nome: "Rua da Orquídea",                apelido: "Rua Projetada 21" },
    { id: "rp22-rosa",     nome: "Rua da Rosa",                    apelido: "Rua Projetada 22" },
    { id: "rp23-tulipa",   nome: "Rua da Tulipa",                  apelido: "Rua Projetada 23" },
    { id: "rp24-violeta",  nome: "Rua da Violeta",                 apelido: "Rua Projetada 24" },
    { id: "av-leste",      nome: "Avenida do Bougainville Leste" },
  ],
  quadras: [
    // ──────────────────────────────────────────────────────────────────────────
    // FAIXA LESTE — coluna do perímetro (Av. Bougainville Leste, x=96-98)
    // De norte (topo) para sul (base). Banda dividida pelas ruas horizontais.
    // ──────────────────────────────────────────────────────────────────────────
    // Topo NE — entre Rua do Cravo e Rua da Camélia
    { id: "q5",  numero: 5,  x: 97, y: 10, loteRangeHint: [50, 66],   ruaPrincipal: "Rua do Cravo" },
    // Entre Camélia e Bromélia
    { id: "q4",  numero: 4,  x: 97, y: 22, loteRangeHint: [41, 49],   ruaPrincipal: "Rua da Camélia" },
    // Entre Bromélia e Begônia
    { id: "q3",  numero: 3,  x: 97, y: 34, loteRangeHint: [31, 40],   ruaPrincipal: "Rua da Begônia" },
    // Entre Begônia e Azaléia (coluna estreita do extremo leste)
    { id: "q2",  numero: 2,  x: 97, y: 46, loteRangeHint: [10, 30],   ruaPrincipal: "Rua da Azaléia" },
    // Entre Azaléia e Av. Roxo (latitude da portaria)
    { id: "q9",  numero: 9,  x: 97, y: 60, loteRangeHint: [150, 167], ruaPrincipal: "Avenida do Bougainville Roxo" },
    // Entre Av. Roxo e Av. Rosa — canto SE pequeno
    { id: "q1",  numero: 1,  x: 98, y: 78, loteRangeHint: [1, 9],     ruaPrincipal: "Avenida do Bougainville Rosa" },

    // ──────────────────────────────────────────────────────────────────────────
    // SEGUNDA COLUNA LESTE (x≈90-92) — paralela à perimetral, NE→S
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q6",  numero: 6,  x: 92, y: 10, loteRangeHint: [67, 84],   ruaPrincipal: "Rua do Cravo" },
    { id: "q7",  numero: 7,  x: 92, y: 22, loteRangeHint: [86, 101],  ruaPrincipal: "Rua da Camélia" },
    { id: "q8",  numero: 8,  x: 92, y: 34, loteRangeHint: [117, 141], ruaPrincipal: "Rua da Begônia" },
    // Banda Begônia-Azaléia, segunda coluna
    { id: "q13", numero: 13, x: 88, y: 46, loteRangeHint: [246, 271], ruaPrincipal: "Rua da Azaléia" },
    // Banda Az-Roxo, segunda coluna leste (oeste de Q9)
    { id: "q12", numero: 12, x: 88, y: 60, loteRangeHint: [232, 245], ruaPrincipal: "Avenida do Bougainville Roxo" },
    // Banda Roxo-Rosa, leste
    { id: "q10", numero: 10, x: 92, y: 72, loteRangeHint: [183, 198], ruaPrincipal: "Avenida do Bougainville Rosa" },

    // ──────────────────────────────────────────────────────────────────────────
    // TERCEIRA COLUNA NE (x≈84) — bloco central NE
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q16", numero: 16, x: 86, y: 10, loteRangeHint: [357, 369], ruaPrincipal: "Rua do Cravo" },
    { id: "q15", numero: 15, x: 86, y: 22, loteRangeHint: [310, 326], ruaPrincipal: "Rua da Camélia" },
    { id: "q14", numero: 14, x: 86, y: 34, loteRangeHint: [278, 301], ruaPrincipal: "Rua da Begônia" },
    { id: "q19", numero: 19, x: 84, y: 46, loteRangeHint: [400, 431], ruaPrincipal: "Rua da Azaléia" },

    // QUADRAS interiores NE (x≈78-82)
    { id: "q17", numero: 17, x: 80, y: 34, loteRangeHint: [371, 394], ruaPrincipal: "Rua da Begônia" },
    { id: "q18", numero: 18, x: 80, y: 46, loteRangeHint: [382, 399], ruaPrincipal: "Rua da Azaléia" },

    // ──────────────────────────────────────────────────────────────────────────
    // FAIXA SUL — Banda entre Av. Bougainville Branco e Av. Bougainville Rosa
    // (south band, y≈92, oeste→leste)
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q11", numero: 11, x: 88, y: 92, loteRangeHint: [199, 218],   ruaPrincipal: "Avenida do Bougainville Branco" },
    { id: "q21", numero: 21, x: 70, y: 92, loteRangeHint: [438, 460],   ruaPrincipal: "Avenida do Bougainville Branco" },
    { id: "q26", numero: 26, x: 56, y: 92, loteRangeHint: [528, 555],   ruaPrincipal: "Avenida do Bougainville Branco" },
    { id: "q31", numero: 31, x: 44, y: 92, loteRangeHint: [640, 657],   ruaPrincipal: "Avenida do Bougainville Branco" },
    { id: "q36", numero: 36, x: 36, y: 92, loteRangeHint: [758, 783],   ruaPrincipal: "Avenida do Bougainville Branco" },
    { id: "q46", numero: 46, x: 22, y: 92, loteRangeHint: [937, 957],   ruaPrincipal: "Avenida do Bougainville Branco" },
    { id: "q52", numero: 52, x: 10, y: 92, loteRangeHint: [1040, 1086], ruaPrincipal: "Avenida do Bougainville Branco" },

    // ──────────────────────────────────────────────────────────────────────────
    // BANDA ENTRE AV. ROSA E AV. ROXO — corpo central, y≈72
    // (oeste→leste)
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q47", numero: 47, x: 18, y: 72, loteRangeHint: [952, 972],  ruaPrincipal: "Avenida do Bougainville Rosa" },
    { id: "q45", numero: 45, x: 28, y: 72, loteRangeHint: [919, 936],  ruaPrincipal: "Avenida do Bougainville Rosa" },
    { id: "q27", numero: 27, x: 50, y: 72, loteRangeHint: [559, 571],  ruaPrincipal: "Avenida do Bougainville Rosa" },
    { id: "q25", numero: 25, x: 60, y: 72, loteRangeHint: [519, 528],  ruaPrincipal: "Avenida do Bougainville Rosa" },
    { id: "q22", numero: 22, x: 68, y: 72, loteRangeHint: [462, 477],  ruaPrincipal: "Avenida do Bougainville Rosa" },
    { id: "q20", numero: 20, x: 76, y: 72, loteRangeHint: [433, 477],  ruaPrincipal: "Avenida do Bougainville Rosa" }, // Q20 contém SEDE I (clube)

    // ──────────────────────────────────────────────────────────────────────────
    // BANDA ENTRE AV. ROXO E RUA DA AZALÉIA (corpo central, y≈58)
    // (oeste→leste)
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q48", numero: 48, x: 16, y: 58, loteRangeHint: [977, 1003], ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q44", numero: 44, x: 26, y: 58, loteRangeHint: [891, 912],  ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q40", numero: 40, x: 36, y: 58, loteRangeHint: [819, 840],  ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q33", numero: 33, x: 46, y: 58, loteRangeHint: [685, 714],  ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q29", numero: 29, x: 54, y: 58, loteRangeHint: [596, 622],  ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q28", numero: 28, x: 62, y: 58, loteRangeHint: [573, 593],  ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q24", numero: 24, x: 70, y: 58, loteRangeHint: [502, 519],  ruaPrincipal: "Avenida do Bougainville Roxo" },
    { id: "q23", numero: 23, x: 78, y: 58, loteRangeHint: [478, 498],  ruaPrincipal: "Avenida do Bougainville Roxo" },

    // ──────────────────────────────────────────────────────────────────────────
    // BANDA ENTRE RUA DA AZALÉIA E RUA DA BEGÔNIA (sub-banda NW central, y≈46)
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q30", numero: 30, x: 50, y: 46, loteRangeHint: [622, 638], ruaPrincipal: "Rua da Azaléia" },
    { id: "q32", numero: 32, x: 42, y: 46, loteRangeHint: [666, 684], ruaPrincipal: "Rua da Azaléia" },

    // ──────────────────────────────────────────────────────────────────────────
    // TRIÂNGULO NOROESTE (oeste do corpo central)
    // Banda alta (entre Rua da Acácia e o ápice norte do triângulo)
    // ──────────────────────────────────────────────────────────────────────────
    { id: "q41", numero: 41, x: 36, y: 32, loteRangeHint: [855, 875], ruaPrincipal: "Rua da Begônia" },
    { id: "q43", numero: 43, x: 28, y: 30, loteRangeHint: [868, 884], ruaPrincipal: "Rua da Begônia" },

    // Banda entre Rua da Acácia e Av. Roxo (interior do triângulo)
    { id: "q34", numero: 34, x: 38, y: 46, loteRangeHint: [728, 754], ruaPrincipal: "Rua da Azaléia" },
    { id: "q35", numero: 35, x: 32, y: 46, loteRangeHint: [754, 783], ruaPrincipal: "Rua da Azaléia" },
    { id: "q37", numero: 37, x: 28, y: 50, loteRangeHint: [784, 803], ruaPrincipal: "Rua do Antúrio" },
    { id: "q38", numero: 38, x: 24, y: 54, loteRangeHint: [804, 818], ruaPrincipal: "Rua do Antúrio" },
    { id: "q39", numero: 39, x: 20, y: 60, loteRangeHint: [841, 854], ruaPrincipal: "Rua do Antúrio" },
    { id: "q42", numero: 42, x: 16, y: 50, loteRangeHint: [851, 867], ruaPrincipal: "Rua do Antúrio" },

    // Apex/extremo NW do triângulo (acima da Rua da Acácia)
    { id: "q49", numero: 49, x: 12, y: 50, loteRangeHint: [999, 1015],  ruaPrincipal: "Rua do Crisântemo" },
    { id: "q50", numero: 50, x: 8,  y: 60, loteRangeHint: [1015, 1022], ruaPrincipal: "Rua do Crisântemo" },
    { id: "q51", numero: 51, x: 6,  y: 78, loteRangeHint: [1023, 1039], ruaPrincipal: "Rua das Flores" },
  ],
  observacoes:
    "Mapeamento extraído de 9 fotografias do mapa físico oficial (1086 lotes, 52 quadras). " +
    "Posições normalizadas 0-100 (x: oeste→leste, y: norte→sul). " +
    "Faixas de lotes (loteRangeHint) são informativas — a roteirização usa apenas o número da quadra. " +
    "A portaria fica no perímetro leste (Av. Bougainville Leste), entre a Av. Roxo e a Rua da Azaléia.",
};

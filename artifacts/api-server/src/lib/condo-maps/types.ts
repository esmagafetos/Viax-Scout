// ─── Tipos do motor de roteamento de condomínios ──────────────────────────────
//
// Versão: 2.0 — refatoração com suporte a identificadores alfanuméricos,
// cadeia de extração priorizada e diagnósticos de parse.
//
// Convenções de coordenadas:
//   x: 0 (oeste) → 100 (leste)
//   y: 0 (norte) → 100 (sul)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Mapa interno ─────────────────────────────────────────────────────────────

export interface Quadra {
  /** Identificador interno único (ex: "qA", "q29", "q3apf"). */
  id: string;

  /**
   * Número da quadra quando puramente numérico.
   * Mutuamente exclusivo com `letra` (só um deve ser definido).
   */
  numero?: number;

  /**
   * Identificador alfanumérico da quadra quando não é puramente numérico.
   * Exemplos: "A", "B1", "A1", "F1", "3APF", "18PD", "1B".
   */
  letra?: string;

  /** Coordenada x normalizada (0–100) no plano cartesiano do mapa. */
  x: number;

  /** Coordenada y normalizada (0–100) no plano cartesiano do mapa. */
  y: number;

  /** Intervalo [min, max] de lotes conhecidos nesta quadra (opcional). */
  loteRangeHint?: [number, number];

  /** Nome da rua principal que serve esta quadra (opcional). */
  ruaPrincipal?: string;
}

export interface RuaInterna {
  id: string;
  nome: string;
  /** Apelido alternativo (ex: "Rua Geovani Marcos" para "Av. Geovani Marcos"). */
  apelido?: string;
}

export interface CondoMap {
  id: string;
  nome: string;
  status: "ativo" | "em_desenvolvimento";
  totalLotes?: number;
  entrada: { x: number; y: number; rotuloEntrada: string };
  quadras: Quadra[];
  ruas: RuaInterna[];
  observacoes?: string;
}

// ─── Parse — tokens de diagnóstico ────────────────────────────────────────────

/**
 * Representa um campo extraído durante o parse de um endereço.
 * Permite rastrear qual padrão (regex) produziu cada valor.
 */
export interface ParseToken {
  /** Campo semântico extraído. */
  campo: "quadra" | "lote" | "loja" | "rua" | "condominio";
  /** Valor bruto capturado pelo regex (antes de conversão numérica). */
  valorBruto: string;
  /** ID do padrão da cadeia que realizou a captura. */
  padrao: string;
  /**
   * Confiança do padrão (0–1).
   * 1.0 = palavra-chave explícita completa ("quadra", "lote").
   * 0.75–0.95 = abreviação reconhecida ("qd", "lt").
   * < 0.75 = inferência implícita (formato alternativo, sem palavra-chave).
   */
  confianca: number;
}

// ─── Resultado do parse ────────────────────────────────────────────────────────

export interface ParsedAddress {
  /**
   * Número da quadra, preenchido quando o identificador é puramente numérico.
   * Exemplos de entrada → valor: "quadra 9" → 9, "QD16" → 16, "Q:01" → 1.
   * Null quando a quadra tem letra/código alfanumérico ou não foi encontrada.
   */
  quadra: number | null;

  /**
   * Identificador alfanumérico da quadra quando contém letras.
   * Exemplos: "A", "F1", "E", "J", "18PD", "3APF", "1B".
   * Null quando quadra é puramente numérica ou não encontrada.
   */
  quadraLetra: string | null;

  /**
   * Número do lote quando puramente numérico.
   * Null quando o lote tem sufixo de letra ("4A") ou não encontrado.
   */
  lote: number | null;

  /**
   * Identificador bruto do lote quando contém sufixo alfanumérico.
   * Exemplos: "4A", "7B".
   * Null quando puramente numérico ou não encontrado.
   */
  loteId: string | null;

  /** Nome da rua interna do condomínio mencionada no endereço. Null se ausente. */
  ruaCitada: string | null;

  /** Indica se o nome ou alias do condomínio aparece no endereço. */
  condoCitado: boolean;

  /** Indica se o endereço corresponde a um comércio/loja (Rua das Pacas + palavra-chave). */
  isLoja: boolean;

  /**
   * Confiança global do parse (0–100).
   * Calculada como média ponderada das confiançass dos tokens mais relevantes.
   * ≥ 80 → parse robusto; 50–79 → parse razoável; < 50 → inferência fraca.
   */
  confianca: number;

  /** Rastreio completo de todos os tokens extraídos durante o parse. */
  tokens: ParseToken[];

  /** Endereço original sem modificações. */
  enderecoOriginal: string;
}

// ─── Linha de entrega ──────────────────────────────────────────────────────────

export type Classificacao =
  | "ordenada"
  | "encontrada_sem_condominio"
  | "loja"
  | "nuance";

export interface DeliveryRow {
  linha: number;
  enderecoOriginal: string;
  quadra: number | null;
  quadraLetra: string | null;
  lote: number | null;
  loteId: string | null;
  classificacao: Classificacao;
  motivo: string;
  ordem?: number;
  instrucao?: string;
  confiancaParse?: number;
}

// ─── Resultado da rota ─────────────────────────────────────────────────────────

export interface RouteResult {
  condominio: { id: string; nome: string };
  totalLinhas: number;
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  totalLojas: number;
  detalhes: DeliveryRow[];
  metricas: { tempo_ms: number };
}

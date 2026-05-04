export interface Quadra {
  id: string;
  numero?: number;
  letra?: string;
  x: number;
  y: number;
  loteRangeHint?: [number, number];
  ruaPrincipal?: string;
}

export interface RuaInterna {
  id: string;
  nome: string;
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

export interface ParsedAddress {
  quadra: number | null;
  quadraLetra: string | null;
  lote: number | null;
  ruaCitada: string | null;
  condoCitado: boolean;
  isLoja: boolean;
  enderecoOriginal: string;
}

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
  classificacao: Classificacao;
  motivo: string;
  ordem?: number;
  instrucao?: string;
}

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

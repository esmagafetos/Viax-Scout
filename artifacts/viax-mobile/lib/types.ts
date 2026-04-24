export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  birthDate: string | null;
  createdAt: string;
};

export type DashboardSummary = {
  totalAnalyses: number;
  totalAddressesProcessed: number;
  avgNuanceRate: number;
  avgGeocodeSuccess: number;
  avgSimilarity: number;
  analysesThisMonth: number;
};

export type RecentAnalysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  status: string;
  createdAt: string;
};

export type FinancialSummary = {
  parserMode: string;
  geocodeCalls: number;
  estimatedCost: number;
  toleranceMeters: number;
};

export type Analysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  geocodeSuccess: number;
  similarityAvg: number;
  processingTimeMs: number;
  parserMode: string;
  status: string;
  createdAt: string;
};

export type AnalysisListResponse = {
  items: Analysis[];
  total: number;
  page: number;
  limit: number;
};

export type UserSettings = {
  parserMode: "builtin" | "google";
  toleranceMeters: number;
  googleApiKey?: string | null;
};

export type Condominium = {
  id: string;
  nome: string;
  cidade: string;
  status: "ativo" | "desenvolvimento";
  totalUnidades?: number;
};

export type SSEStep = { step: string; progress?: number };
export type SSEResultRow = {
  linha: number;
  endereco: string;
  parsed?: unknown;
  geocodeOk?: boolean;
  similarity?: number;
  nuance?: boolean;
  ruaEntregue?: string;
  ruaEsperada?: string;
  distancia?: number;
  motivo?: string;
};
export type SSEResult = {
  analysisId?: number;
  totalAddresses: number;
  nuances: number;
  geocodeSuccess: number;
  similarityAvg: number;
  processingTimeMs: number;
  rows: SSEResultRow[];
};
export type SSEError = { error: string };

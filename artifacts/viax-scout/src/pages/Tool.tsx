import React, { useEffect, useRef, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";

// ── Interfaces ────────────────────────────────────────────────────────────────
interface CondoSummary {
  id: string;
  nome: string;
  status: "ativo" | "em_desenvolvimento";
  totalLotes?: number;
}

interface DeliveryRow {
  linha: number;
  enderecoOriginal: string;
  quadra: number | null;
  quadraLetra: string | null;
  lote: number | null;
  loteId: string | null;
  classificacao: "ordenada" | "encontrada_sem_condominio" | "loja" | "nuance";
  motivo: string;
  ordem?: number;
  instrucao?: string;
  confiancaParse?: number;
  ruaCitada?: string | null;
}

interface RouteResult {
  condominio: { id: string; nome: string };
  totalLinhas: number;
  totalOriginal?: number;
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  totalLojas: number;
  detalhes: DeliveryRow[];
  metricas: { tempo_ms: number };
}

type UIMode = "setup" | "processing" | "ready" | "navigating" | "completed";
type ManeuverType = "left" | "right" | "straight" | "uturn" | "entry";

// ── Label helpers ─────────────────────────────────────────────────────────────
function quadraLabel(row: DeliveryRow): string {
  if (row.classificacao === "loja") return "Loja / Comércio";
  if (row.quadraLetra) return `Quadra ${row.quadraLetra}`;
  if (row.quadra !== null) return `Quadra ${row.quadra}`;
  return "—";
}

function loteLabel(row: DeliveryRow): string {
  if (row.loteId) return `Lote ${row.loteId}`;
  if (row.lote !== null) return `Lote ${row.lote}`;
  return "";
}

function quadraLoteLabel(row: DeliveryRow): string {
  const q = quadraLabel(row);
  const l = loteLabel(row);
  return l ? `${q} · ${l}` : q;
}

const CLASS_COLOR: Record<DeliveryRow["classificacao"], string> = {
  ordenada: "var(--ok)",
  encontrada_sem_condominio: "#7c3aed",
  loja: "#0ea5e9",
  nuance: "var(--accent)",
};

const CLASS_LABEL: Record<DeliveryRow["classificacao"], string> = {
  ordenada: "Ordenada",
  encontrada_sem_condominio: "Sem condomínio",
  loja: "Loja",
  nuance: "Nuance",
};

// ── Instruction parsing ───────────────────────────────────────────────────────
function parseInstrucao(instrucao: string): {
  maneuver: string;
  destino: string;
  isLastDelivery: boolean;
} {
  const isLast = instrucao.includes("Última entrega");
  const sem = instrucao.replace(" Última entrega.", "");
  const dot = sem.indexOf(". ");
  if (dot === -1) {
    return { maneuver: sem.replace(/\.+$/, ""), destino: "", isLastDelivery: isLast };
  }
  return {
    maneuver: sem.slice(0, dot),
    destino: sem.slice(dot + 2).replace(/\.+$/, "").trim(),
    isLastDelivery: isLast,
  };
}

function detectManeuver(instrucao: string): ManeuverType {
  const lower = instrucao.toLowerCase();
  if (lower.includes("retorno")) return "uturn";
  if (lower.includes("esquerda")) return "left";
  if (lower.includes("direita")) return "right";
  if (lower.includes("continue") || lower.includes("frente")) return "straight";
  return "entry";
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg, #d4521a 0%, #9333ea 100%)";
const GRAD_DIM = "linear-gradient(135deg, rgba(212,82,26,0.10) 0%, rgba(147,51,234,0.10) 100%)";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconTurnLeft = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,14 4,9 9,4" />
    <path d="M20,20 v-7 a4,4 0 0,0-4,-4 H4" />
  </svg>
);

const IconTurnRight = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,14 20,9 15,4" />
    <path d="M4,20 v-7 a4,4 0 0,1 4,-4 H20" />
  </svg>
);

const IconGoStraight = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="4" />
    <polyline points="7,9 12,4 17,9" />
  </svg>
);

const IconUTurn = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9,19 V9 a5,5 0 0,1 10,0 v2" />
    <polyline points="5,15 9,19 13,15" />
  </svg>
);

const IconGate = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="7" height="20" rx="1" />
    <rect x="14" y="2" width="7" height="20" rx="1" />
    <circle cx="10" cy="12" r="1" fill="currentColor" />
  </svg>
);

const IconNavArrow = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3,11 22,2 13,21 11,13" />
  </svg>
);

const IconCheck = ({ size = 22 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const IconCheckCircle = ({ size = 36 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
);

const IconAlert = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconRefresh = ({ size = 15 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,4 1,10 7,10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
  </svg>
);

const IconPlay = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const IconDownload = ({ size = 12 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconChevronLeft = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

const IconChevronRight = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

const IconMapPin = ({ size = 13 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconUpload = ({ size = 26 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <polyline points="9,15 12,12 15,15" />
  </svg>
);

const IconRoute = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

// ── Direction icon dispatcher ─────────────────────────────────────────────────
function DirectionIcon({ type, size = 24 }: { type: ManeuverType; size?: number }) {
  switch (type) {
    case "left":     return <IconTurnLeft size={size} />;
    case "right":    return <IconTurnRight size={size} />;
    case "straight": return <IconGoStraight size={size} />;
    case "uturn":    return <IconUTurn size={size} />;
    default:         return <IconGate size={size} />;
  }
}

// ── Shared UI sub-components ──────────────────────────────────────────────────
function Chip({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.14em",
      textTransform: "uppercase", padding: "0.28rem 0.75rem",
      borderRadius: 99, background: GRAD_DIM,
      border: "1px solid rgba(212,82,26,0.2)",
      color: "#d4521a",
      ...style,
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase", color: "var(--text-faint)",
    }}>
      {children}
    </span>
  );
}

function CardHeader({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{
      padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      {left}
      {right}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Tool() {
  const [condos, setCondos] = useState<CondoSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("gravata-ii");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [doneSteps, setDoneSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [mode, setMode] = useState<UIMode>("setup");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [deliveredLines, setDeliveredLines] = useState<Set<number>>(new Set());
  const [skippedLines, setSkippedLines] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    fetch(`${base}/api/condominium/list`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = d.condominios ?? [];
        setCondos(list);
        const first = list.find((c: CondoSummary) => c.status === "ativo");
        if (first) setSelectedId(first.id);
      })
      .catch(() => setCondos([]));
  }, [base]);

  const selected = condos.find((c) => c.id === selectedId);
  const canProcess = !!file && !isProcessing && selected?.status === "ativo";

  const routeRows = useMemo(() => {
    if (!result) return [];
    return result.detalhes
      .filter((r) => r.ordem != null)
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));
  }, [result]);

  const nuanceRows = useMemo(() => {
    if (!result) return [];
    return result.detalhes.filter((r) => r.classificacao === "nuance");
  }, [result]);

  const currentRow = routeRows[currentIdx] ?? null;
  const addStep = (msg: string) => setSteps((prev) => [...prev.slice(-20), msg]);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      showToast("Formato inválido. Use .xlsx ou .csv");
      return;
    }
    setFile(f);
    setResult(null);
    setSteps([]);
    setDoneSteps([]);
    setMode("setup");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file || !selected) return;
    if (selected.status !== "ativo") {
      showToast("Este condomínio ainda está em desenvolvimento.");
      return;
    }
    setIsProcessing(true);
    setMode("processing");
    setSteps([]);
    setDoneSteps([]);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("condominioId", selected.id);
      const response = await fetch(`${base}/api/condominium/process`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!response.ok || !response.body) {
        showToast("Erro ao processar arquivo.");
        setMode("setup");
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          let eventType = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === "step" && parsed.step) addStep(parsed.step);
            else if (eventType === "result" && parsed.result) {
              setResult(parsed.result);
              setDoneSteps((prev) => [...prev, ...steps, "Sequência logística pronta."]);
              addStep("Sequência logística pronta.");
              setMode("ready");
            } else if (eventType === "error" && parsed.error) {
              showToast(parsed.error);
              setMode("setup");
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      showToast("Erro de conexão: " + (err.message ?? String(err)));
      setMode("setup");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIniciar = () => {
    setCurrentIdx(0);
    setDeliveredLines(new Set());
    setSkippedLines(new Set());
    setMode("navigating");
  };

  const handleEntregue = () => {
    if (!currentRow) return;
    setDeliveredLines((prev) => new Set([...prev, currentRow.linha]));
    const next = currentIdx + 1;
    if (next >= routeRows.length) setMode("completed");
    else setCurrentIdx(next);
  };

  const handlePular = () => {
    if (!currentRow) return;
    setSkippedLines((prev) => new Set([...prev, currentRow.linha]));
    const next = currentIdx + 1;
    if (next >= routeRows.length) setMode("completed");
    else setCurrentIdx(next);
  };

  const handleAnterior = () => {
    if (currentIdx === 0) return;
    const prev = currentIdx - 1;
    const prevRow = routeRows[prev];
    if (prevRow) {
      setDeliveredLines((s) => { const n = new Set(s); n.delete(prevRow.linha); return n; });
      setSkippedLines((s) => { const n = new Set(s); n.delete(prevRow.linha); return n; });
    }
    setCurrentIdx(prev);
  };

  const handleNovaRota = () => {
    setResult(null);
    setFile(null);
    setSteps([]);
    setDoneSteps([]);
    setCurrentIdx(0);
    setDeliveredLines(new Set());
    setSkippedLines(new Set());
    setMode("setup");
  };

  const exportCsv = () => {
    if (!result) return;
    const header = ["Ordem", "Linha", "Quadra", "Lote", "Classificação", "Confiança%", "Rua Interna", "Endereço", "Instrução", "Motivo"];
    const rows = result.detalhes.map((r) => [
      r.ordem ?? "",
      r.linha,
      r.quadraLetra ?? r.quadra ?? "",
      r.loteId ?? r.lote ?? "",
      CLASS_LABEL[r.classificacao],
      r.confiancaParse ?? "",
      r.ruaCitada ?? "",
      r.enderecoOriginal,
      r.instrucao ?? "",
      r.motivo,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viax-${result.condominio.id}-${file?.name ?? "rota"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // MODO: NAVEGAÇÃO
  // ══════════════════════════════════════════════════════════════════════════════
  if (mode === "navigating" && currentRow) {
    const { maneuver, destino, isLastDelivery } = parseInstrucao(currentRow.instrucao ?? "");
    const maneuverType = detectManeuver(currentRow.instrucao ?? "");
    const total = routeRows.length;
    const progress = ((currentIdx + 1) / total) * 100;
    const isSemCondo = currentRow.classificacao === "encontrada_sem_condominio";

    return (
      <Layout>
        {ToastComponent}
        <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: "2rem" }}>

          {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: "0.85rem",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{
              padding: "0.9rem 1.2rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{
                  fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.13em",
                  textTransform: "uppercase", color: "var(--text-faint)",
                  marginBottom: "0.2rem",
                }}>
                  {result?.condominio.nome}
                </div>
                <div style={{
                  fontSize: "1.05rem", fontWeight: 900, color: "var(--text)",
                  letterSpacing: "-0.02em",
                }}>
                  Entrega {currentIdx + 1}{" "}
                  <span style={{ fontWeight: 500, color: "var(--text-faint)", fontSize: "0.9rem" }}>
                    de {total}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMode("completed")}
                style={{
                  fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)",
                  background: "none", border: "1px solid var(--border-strong)",
                  borderRadius: 99, padding: "0.38rem 0.9rem", cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Encerrar
              </button>
            </div>

            {/* Barra de progresso */}
            <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
              <div style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: `${progress}%`,
                background: GRAD,
                transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>

            {/* Pontos de progresso */}
            <div style={{ padding: "0.6rem 1.2rem 0.75rem", display: "flex", gap: "0.28rem", flexWrap: "wrap" }}>
              {routeRows.map((r, i) => {
                const isDone = deliveredLines.has(r.linha);
                const isSkipped = skippedLines.has(r.linha);
                const isCurrent = i === currentIdx;
                return (
                  <div key={r.linha} style={{
                    width: isCurrent ? 20 : 7, height: 7,
                    borderRadius: 99,
                    background: isDone
                      ? "var(--ok)"
                      : isSkipped
                        ? "var(--accent)"
                        : isCurrent
                          ? "#9333ea"
                          : "var(--border-strong)",
                    transition: "all 0.25s ease",
                    flexShrink: 0,
                  }} />
                );
              })}
            </div>
          </div>

          {/* ── Card de instrução — ponto focal da tela ───────────────────── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: "0.85rem",
            boxShadow: "var(--shadow-md)",
          }}>
            {/* Faixa superior com gradiente sutil */}
            <div style={{
              height: 3,
              background: GRAD,
            }} />

            <div style={{ padding: "1.35rem 1.25rem 1.4rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.1rem" }}>

                {/* Ícone direcional */}
                <div style={{
                  width: 58, height: 58, borderRadius: 14, flexShrink: 0,
                  background: GRAD,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 4px 18px rgba(212,82,26,0.28)",
                }}>
                  <DirectionIcon type={maneuverType} size={26} />
                </div>

                <div style={{ flex: 1 }}>
                  {/* Label */}
                  <div style={{
                    fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "var(--text-faint)",
                    marginBottom: "0.55rem",
                  }}>
                    Instrução de navegação
                  </div>

                  {/* Manobra — texto principal */}
                  <div style={{
                    fontSize: "1.08rem", fontWeight: 800, lineHeight: 1.45,
                    color: "var(--text)", letterSpacing: "-0.01em",
                    marginBottom: destino ? "0.85rem" : 0,
                  }}>
                    {maneuver || (currentRow.instrucao ?? "Siga as instruções do mapa.")}
                  </div>

                  {/* Destino — chip destacado */}
                  {destino && (
                    <div style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "0.42rem 1rem",
                      background: GRAD_DIM,
                      border: "1px solid rgba(212,82,26,0.22)",
                      borderRadius: 99,
                      fontSize: "0.82rem", fontWeight: 700,
                      color: "var(--text)",
                      letterSpacing: "0.01em",
                    }}>
                      {destino}
                    </div>
                  )}

                  {/* Badge "Última entrega" */}
                  {isLastDelivery && (
                    <div style={{
                      marginTop: "0.65rem",
                      display: "inline-flex", alignItems: "center", gap: "0.3rem",
                      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--ok)",
                      background: "rgba(26,122,74,0.1)", borderRadius: 99,
                      padding: "0.25rem 0.65rem",
                      border: "1px solid rgba(26,122,74,0.2)",
                    }}>
                      Última entrega
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Card de info da entrega ───────────────────────────────────── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 14,
            padding: "1.05rem 1.2rem",
            marginBottom: "0.85rem",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
              <div style={{
                fontSize: "1.05rem", fontWeight: 900, color: "var(--text)",
                display: "flex", alignItems: "center", gap: "0.5rem",
                letterSpacing: "-0.015em",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 7,
                  background: GRAD_DIM, color: "#d4521a",
                  fontSize: "0.72rem", fontWeight: 900,
                  border: "1px solid rgba(212,82,26,0.2)",
                  flexShrink: 0,
                }}>
                  {currentRow.ordem}
                </span>
                {quadraLoteLabel(currentRow)}
              </div>
              {isSemCondo && (
                <span style={{
                  fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.06em",
                  color: "#7c3aed", background: "rgba(124,58,237,0.08)",
                  borderRadius: 99, padding: "0.22rem 0.6rem",
                  border: "1px solid rgba(124,58,237,0.2)", flexShrink: 0,
                }}>
                  SEM CONDOMÍNIO
                </span>
              )}
            </div>
            {currentRow.ruaCitada && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.74rem", color: "#7c3aed", fontWeight: 600,
                marginBottom: "0.35rem",
              }}>
                <IconMapPin />
                {currentRow.ruaCitada}
              </div>
            )}
            <div style={{ fontSize: "0.76rem", color: "var(--text-faint)", lineHeight: 1.55, wordBreak: "break-word" }}>
              {currentRow.enderecoOriginal}
            </div>
          </div>

          {/* ── ENTREGUE ──────────────────────────────────────────────────── */}
          <button
            onClick={handleEntregue}
            style={{
              width: "100%", padding: "1.15rem",
              background: "var(--ok)",
              color: "#fff", border: "none", borderRadius: 14,
              fontSize: "1rem", fontWeight: 900, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.55rem",
              boxShadow: "0 4px 20px rgba(26,122,74,0.3)",
              fontFamily: "inherit", marginBottom: "0.6rem",
              letterSpacing: "0.04em",
              transition: "transform 0.12s, box-shadow 0.12s",
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(26,122,74,0.2)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(26,122,74,0.3)"; }}
          >
            <IconCheck size={20} />
            ENTREGUE
          </button>

          {/* ── Botões secundários ────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <button
              onClick={handleAnterior}
              disabled={currentIdx === 0}
              style={{
                flex: 1, padding: "0.72rem",
                background: "var(--surface-2)",
                color: currentIdx === 0 ? "var(--text-faint)" : "var(--text)",
                border: "1px solid var(--border-strong)", borderRadius: 10,
                fontSize: "0.82rem", fontWeight: 600,
                cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                opacity: currentIdx === 0 ? 0.4 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <IconChevronLeft />
              Anterior
            </button>
            <button
              onClick={handlePular}
              style={{
                flex: 1, padding: "0.72rem",
                background: "var(--surface-2)", color: "var(--accent)",
                border: "1px solid var(--border-strong)", borderRadius: 10,
                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
              }}
            >
              Pular
              <IconChevronRight />
            </button>
          </div>

          {/* ── Aviso de nuances ──────────────────────────────────────────── */}
          {nuanceRows.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1rem",
              background: "var(--accent-dim)",
              border: "1px solid rgba(212,82,26,0.2)", borderRadius: 10,
              fontSize: "0.74rem", color: "var(--accent)", fontWeight: 500,
            }}>
              <IconAlert />
              {nuanceRows.length} endereço{nuanceRows.length !== 1 ? "s" : ""} não roteado{nuanceRows.length !== 1 ? "s" : ""} — verificar manualmente.
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MODO: CONCLUÍDA
  // ══════════════════════════════════════════════════════════════════════════════
  if (mode === "completed") {
    const totalEntregues = deliveredLines.size;
    const totalPuladas = skippedLines.size;
    const totalPendentes = routeRows.length - totalEntregues - totalPuladas;

    return (
      <Layout>
        {ToastComponent}
        <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: "2rem" }}>

          {/* ── Card de celebração com header gradiente ───────────────────── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: "1.25rem",
            boxShadow: "var(--shadow-md)",
          }}>
            {/* Seção superior — gradiente real como fundo */}
            <div style={{
              background: GRAD,
              padding: "2rem 1.75rem 1.75rem",
              textAlign: "center",
              position: "relative",
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                border: "1.5px solid rgba(255,255,255,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.1rem",
                color: "#fff",
                backdropFilter: "blur(4px)",
              }}>
                <IconCheckCircle size={34} />
              </div>
              <div style={{
                fontSize: "1.5rem", fontWeight: 900, color: "#fff",
                letterSpacing: "-0.025em", marginBottom: "0.3rem",
              }}>
                Rota finalizada!
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                {result?.condominio.nome}
              </div>
            </div>

            {/* Métricas */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              borderTop: "1px solid var(--border)",
            }}>
              {[
                { value: totalEntregues, label: "Entregues", color: "var(--ok)" },
                { value: totalPuladas, label: "Puladas", color: "var(--accent)" },
                { value: nuanceRows.length + totalPendentes, label: "Não roteadas", color: "var(--text-faint)" },
              ].map(({ value, label, color }, i, arr) => (
                <div key={label} style={{
                  padding: "1.1rem 0.75rem", textAlign: "center",
                  borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{
                    fontSize: "1.75rem", fontWeight: 900, color,
                    letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "0.3rem",
                  }}>
                    {value}
                  </div>
                  <div style={{
                    fontSize: "0.6rem", color: "var(--text-faint)",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Entregas puladas ─────────────────────────────────────────── */}
          {skippedLines.size > 0 && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: 14, overflow: "hidden", marginBottom: "1rem",
            }}>
              <CardHeader left={<SectionLabel>Entregas puladas</SectionLabel>} />
              {routeRows.filter((r) => skippedLines.has(r.linha)).map((r) => (
                <div key={r.linha} style={{
                  padding: "0.7rem 1.25rem", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: "0.6rem",
                }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--accent)", minWidth: 22 }}>#{r.ordem}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text)", flex: 1 }}>{quadraLoteLabel(r)}</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>linha {r.linha}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleNovaRota}
            style={{
              width: "100%", padding: "0.9rem",
              background: GRAD,
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
              boxShadow: "0 4px 18px rgba(212,82,26,0.25)",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <IconRefresh />
            Nova Rota
          </button>
        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MODOS: SETUP / PROCESSING / READY
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <Layout>
      {ToastComponent}

      {/* ── Cabeçalho da página ───────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <Chip style={{ marginBottom: "0.75rem" }}>
          <IconRoute size={9} />
          Ferramentas · Roteirização
        </Chip>
        <h1 style={{
          fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.025em",
          marginBottom: "0.3rem", color: "var(--text)",
        }}>
          Condomínios Fechados
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", lineHeight: 1.5 }}>
          Roteirização semântica com navegação ordinal — Nova Califórnia, Tamoios · Cabo Frio
        </p>
      </div>

      {/* ── Seletor de condomínio ─────────────────────────────────────────── */}
      {mode !== "ready" && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16, overflow: "hidden",
          marginBottom: "1.25rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <CardHeader left={<SectionLabel>Selecionar condomínio</SectionLabel>} />
          <div style={{ padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {condos.map((c) => {
              const isActive = c.id === selectedId;
              const isAvail = c.status === "ativo";
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (isAvail) {
                      setSelectedId(c.id);
                      setResult(null);
                      setFile(null);
                      setSteps([]);
                      setDoneSteps([]);
                      setMode("setup");
                    }
                  }}
                  disabled={!isAvail}
                  style={{
                    textAlign: "left",
                    padding: "0.9rem 1.1rem",
                    borderRadius: 12,
                    border: isActive
                      ? "1.5px solid rgba(212,82,26,0.45)"
                      : "1.5px solid var(--border-strong)",
                    background: isActive ? GRAD_DIM : "var(--surface-2)",
                    cursor: isAvail ? "pointer" : "not-allowed",
                    opacity: isAvail ? 1 : 0.45,
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    fontFamily: "inherit",
                    boxShadow: isActive ? "inset 3px 0 0 #d4521a" : "none",
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: "0.9rem", fontWeight: 700,
                      color: isActive ? "var(--text)" : "var(--text)",
                      marginBottom: "0.2rem",
                    }}>
                      {c.nome}
                    </div>
                    <div style={{
                      fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: isAvail ? "var(--ok)" : "var(--text-faint)",
                    }}>
                      {isAvail
                        ? `Disponível${c.totalLotes ? ` · ${c.totalLotes} lotes` : ""}`
                        : "Em desenvolvimento"}
                    </div>
                  </div>
                  {isActive && isAvail && (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: GRAD, flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upload / Processing ───────────────────────────────────────────── */}
      {(mode === "setup" || mode === "processing") && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16, overflow: "hidden",
          marginBottom: "1.5rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <CardHeader left={<SectionLabel>Importar planilha — {selected?.nome ?? "—"}</SectionLabel>} />

          {/* Zona de upload */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              margin: "0.85rem",
              padding: "2.25rem 1.5rem",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "0.85rem", cursor: "pointer",
              borderRadius: 12,
              border: `2px dashed ${isDragOver ? "#d4521a" : file ? "rgba(212,82,26,0.45)" : "var(--border-strong)"}`,
              background: isDragOver
                ? GRAD_DIM
                : file
                  ? "rgba(212,82,26,0.04)"
                  : "transparent",
              transition: "all 200ms",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: file ? GRAD_DIM : "var(--surface-2)",
              border: file ? "1px solid rgba(212,82,26,0.25)" : "1px solid var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: file ? "#d4521a" : "var(--text-faint)",
              transition: "all 200ms",
            }}>
              <IconUpload size={24} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "0.95rem", fontWeight: 700,
                color: "var(--text)", marginBottom: "0.3rem",
              }}>
                {file ? file.name : "Arraste a planilha aqui"}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-faint)" }}>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB · pronto para roteirizar`
                  : 'XLSX ou CSV · coluna "Destination Address" · máx 10MB'}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.52rem 1.25rem", borderRadius: 99,
                background: GRAD, color: "#fff",
                fontSize: "0.78rem", fontWeight: 700, border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(212,82,26,0.28)",
                fontFamily: "inherit",
              }}
            >
              {file ? "Trocar arquivo" : "Selecionar arquivo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Botão Roteirizar */}
          <div style={{ padding: "0 0.85rem 0.85rem" }}>
            <button
              onClick={handleProcess}
              disabled={!canProcess}
              style={{
                width: "100%", display: "flex",
                alignItems: "center", justifyContent: "center", gap: "0.55rem",
                padding: "0.9rem 1.5rem", borderRadius: 12,
                background: canProcess ? GRAD : "var(--surface-2)",
                color: canProcess ? "#fff" : "var(--text-faint)",
                border: canProcess ? "none" : "1px solid var(--border-strong)",
                fontSize: "0.92rem", fontWeight: 800,
                cursor: !canProcess ? "not-allowed" : "pointer",
                boxShadow: canProcess ? "0 4px 18px rgba(212,82,26,0.28)" : "none",
                transition: "all 200ms",
                fontFamily: "inherit",
                letterSpacing: "0.01em",
              }}
            >
              <IconRoute size={15} />
              {isProcessing ? "Processando..." : "Roteirizar Entregas"}
            </button>
          </div>

          {/* Spinner + steps */}
          {isProcessing && (
            <div style={{
              padding: "0.5rem 1.5rem 2rem",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "1.1rem",
            }}>
              {/* Spinner com gradiente */}
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: "50%",
                  border: "3px solid var(--border-strong)",
                  borderTopColor: "#d4521a",
                  borderRightColor: "#9333ea",
                  animation: "none",
                }} className="animate-spin-ring" />
              </div>
              <div style={{
                fontSize: "0.8rem", fontWeight: 600,
                color: "var(--text-faint)", textAlign: "center",
              }}>
                Identificando quadras e gerando sequência logística...
              </div>
              <div style={{
                display: "flex", flexDirection: "column",
                gap: "0.4rem", width: "100%", maxWidth: 420,
              }}>
                {steps.map((step, i) => (
                  <div key={i} className="animate-step-in" style={{
                    display: "flex", alignItems: "flex-start",
                    gap: "0.55rem", fontSize: "0.73rem",
                    color: "var(--text-faint)",
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: GRAD.replace("linear-gradient(135deg, ", "").split(" ")[0],
                      flexShrink: 0, marginTop: 5,
                    }} className="animate-pulse-dot" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODO READY
         ══════════════════════════════════════════════════════════════════════ */}
      {mode === "ready" && result && (
        <div className="animate-fade-up">

          {/* ── Hero header do resultado ─────────────────────────────────── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16, overflow: "hidden",
            marginBottom: "1.25rem",
            boxShadow: "var(--shadow-sm)",
          }}>
            {/* Topo com gradiente */}
            <div style={{ height: 3, background: GRAD }} />
            <div style={{
              padding: "1.25rem",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "0.75rem",
            }}>
              <div>
                <div style={{
                  fontSize: "1.15rem", fontWeight: 900,
                  color: "var(--text)", letterSpacing: "-0.02em",
                  marginBottom: "0.2rem",
                }}>
                  {result.condominio.nome}
                </div>
                {result.totalOriginal && result.totalOriginal > result.totalLinhas && (
                  <div style={{ fontSize: "0.74rem", color: "var(--text-faint)" }}>
                    {result.totalLinhas} de {result.totalOriginal} endereços em Nova Califórnia
                  </div>
                )}
              </div>
              <button
                onClick={handleNovaRota}
                style={{
                  fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)",
                  background: "none", border: "1px solid var(--border-strong)",
                  borderRadius: 99, padding: "0.38rem 0.9rem", cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  whiteSpace: "nowrap",
                }}
              >
                <IconChevronLeft size={11} />
                Nova planilha
              </button>
            </div>

            {/* Grid de estatísticas */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid var(--border)",
            }}>
              {[
                { value: routeRows.length, label: "Entregas", color: "var(--ok)" },
                { value: result.totalNuances, label: "Nuances", color: "var(--accent)" },
                { value: result.totalLojas, label: "Lojas", color: "#0ea5e9" },
                { value: `${result.metricas.tempo_ms}ms`, label: "Tempo", color: "var(--text-faint)" },
              ].map(({ value, label, color }, i, arr) => (
                <div key={label} style={{
                  padding: "0.85rem 0.5rem", textAlign: "center",
                  borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{
                    fontSize: "1.35rem", fontWeight: 900, color,
                    letterSpacing: "-0.025em", lineHeight: 1,
                    marginBottom: "0.25rem",
                  }}>
                    {value}
                  </div>
                  <div style={{
                    fontSize: "0.58rem", color: "var(--text-faint)",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Aviso de nuances ─────────────────────────────────────────── */}
          {nuanceRows.length > 0 && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "0.65rem",
              padding: "0.9rem 1.05rem", marginBottom: "1rem",
              background: "var(--accent-dim)",
              border: "1px solid rgba(212,82,26,0.25)",
              borderRadius: 12, fontSize: "0.8rem",
              color: "var(--accent)", lineHeight: 1.5,
            }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}><IconAlert /></div>
              <span>
                <strong>{nuanceRows.length} endereço{nuanceRows.length !== 1 ? "s" : ""} não roteado{nuanceRows.length !== 1 ? "s" : ""}.</strong>{" "}
                Quadra não identificada no mapa interno — verifique manualmente após a rota.
              </span>
            </div>
          )}

          {/* ── INICIAR ROTA ─────────────────────────────────────────────── */}
          {routeRows.length > 0 ? (
            <button
              onClick={handleIniciar}
              style={{
                width: "100%", padding: "1.2rem",
                background: GRAD,
                color: "#fff", border: "none", borderRadius: 14,
                fontSize: "1.05rem", fontWeight: 900, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                boxShadow: "0 6px 28px rgba(212,82,26,0.32)",
                fontFamily: "inherit", marginBottom: "1rem",
                letterSpacing: "0.02em",
                transition: "transform 0.12s, box-shadow 0.12s",
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <IconPlay />
              INICIAR ROTA · {routeRows.length} entregas
            </button>
          ) : (
            <div style={{
              padding: "1.25rem", textAlign: "center",
              background: "var(--surface)", border: "1px solid var(--border-strong)",
              borderRadius: 14, color: "var(--text-faint)",
              fontSize: "0.85rem", marginBottom: "1rem",
            }}>
              Nenhuma entrega roteável encontrada.
            </div>
          )}

          {/* ── Sequência de entregas ─────────────────────────────────────── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <CardHeader
              left={<SectionLabel>Sequência de Entregas</SectionLabel>}
              right={
                <button
                  onClick={exportCsv}
                  style={{
                    padding: "0.35rem 0.8rem", borderRadius: 99,
                    fontSize: "0.68rem", fontWeight: 600,
                    background: "var(--surface-2)", color: "var(--text)",
                    border: "1px solid var(--border-strong)", cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: "0.3rem",
                  }}
                >
                  <IconDownload size={11} />
                  CSV
                </button>
              }
            />

            <div style={{ display: "flex", flexDirection: "column" }}>
              {routeRows.length === 0 && (
                <div style={{
                  padding: "1.5rem", textAlign: "center",
                  color: "var(--text-faint)", fontSize: "0.8rem",
                }}>
                  Nenhuma entrega roteável.
                </div>
              )}

              {routeRows.map((r, idx) => {
                const color = CLASS_COLOR[r.classificacao];
                const { maneuver, destino } = parseInstrucao(r.instrucao ?? "");
                const mtype = detectManeuver(r.instrucao ?? "");

                return (
                  <div key={`${r.linha}-${idx}`} style={{
                    padding: "0.9rem 1.25rem",
                    borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                    display: "flex", gap: "0.75rem", alignItems: "flex-start",
                  }}>
                    {/* Ordem badge */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: `${color}12`, color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: "0.7rem",
                      border: `1px solid ${color}25`,
                      marginTop: 2,
                    }}>
                      {r.ordem}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Quadra · Lote */}
                      <div style={{
                        fontSize: "0.88rem", fontWeight: 800,
                        color: "var(--text)", marginBottom: "0.25rem",
                        letterSpacing: "-0.01em",
                      }}>
                        {quadraLoteLabel(r)}
                      </div>

                      {/* Instrução dividida */}
                      {r.instrucao && (
                        <div style={{ marginBottom: "0.22rem" }}>
                          <div style={{
                            display: "flex", alignItems: "flex-start", gap: "0.35rem",
                            fontSize: "0.73rem", color: "var(--text-faint)",
                            lineHeight: 1.45, marginBottom: "0.18rem",
                          }}>
                            <span style={{ flexShrink: 0, color: "#d4521a", marginTop: 1 }}>
                              <DirectionIcon type={mtype} size={11} />
                            </span>
                            <span style={{ fontStyle: "italic" }}>{maneuver}</span>
                          </div>
                          {destino && (
                            <span style={{
                              display: "inline-block",
                              fontSize: "0.64rem", fontWeight: 700,
                              color: "#9333ea",
                              background: "rgba(147,51,234,0.08)",
                              borderRadius: 99, padding: "0.15rem 0.55rem",
                              border: "1px solid rgba(147,51,234,0.15)",
                              marginLeft: "1.1rem",
                            }}>
                              {destino}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Endereço original */}
                      <div style={{
                        fontSize: "0.68rem", color: "var(--text-faint)",
                        wordBreak: "break-word",
                      }}>
                        {r.enderecoOriginal}
                      </div>
                    </div>

                    {r.classificacao !== "ordenada" && (
                      <span style={{
                        fontSize: "0.58rem", fontWeight: 700, color,
                        background: `${color}10`, borderRadius: 99,
                        padding: "0.2rem 0.5rem", flexShrink: 0, marginTop: 3,
                        border: `1px solid ${color}20`,
                      }}>
                        {CLASS_LABEL[r.classificacao]}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Nuances */}
              {nuanceRows.length > 0 && (
                <>
                  <div style={{
                    padding: "0.55rem 1.25rem",
                    background: "var(--accent-dim)", borderTop: "1px solid var(--border)",
                    display: "flex", alignItems: "center", gap: "0.4rem",
                  }}>
                    <IconAlert size={12} />
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 800,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "var(--accent)",
                    }}>
                      Não roteadas — verificar manualmente
                    </span>
                  </div>
                  {nuanceRows.map((r, idx) => (
                    <div key={`n-${r.linha}-${idx}`} style={{
                      padding: "0.78rem 1.25rem",
                      borderTop: "1px solid var(--border)",
                      display: "flex", gap: "0.75rem", alignItems: "center",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: "var(--accent-dim)", color: "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(212,82,26,0.2)",
                      }}>
                        <IconAlert size={13} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.78rem", color: "var(--text-faint)",
                          wordBreak: "break-word", marginBottom: "0.15rem",
                        }}>
                          {r.enderecoOriginal}
                        </div>
                        <div style={{ fontSize: "0.67rem", color: "var(--accent)" }}>
                          {r.motivo}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── Log de processamento ────────────────────────────────────── */}
          {doneSteps.length > 0 && (
            <div style={{
              marginTop: "0.75rem", padding: "0.8rem 1rem",
              background: "var(--surface)", border: "1px solid var(--border-strong)",
              borderRadius: 10,
            }}>
              {doneSteps.map((step, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start",
                  gap: "0.4rem", fontSize: "0.67rem",
                  color: "var(--text-faint)", marginBottom: "0.2rem",
                }}>
                  <span style={{ color: "var(--ok)", flexShrink: 0 }}>✓</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

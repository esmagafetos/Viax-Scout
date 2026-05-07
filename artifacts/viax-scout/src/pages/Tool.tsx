import React, { useEffect, useRef, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";

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

// ── SVG icons ────────────────────────────────────────────────────────────────
const IconGate = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="7" height="20" rx="1"/>
    <rect x="14" y="2" width="7" height="20" rx="1"/>
    <circle cx="10" cy="12" r="1" fill="currentColor"/>
  </svg>
);

const IconNavArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3,11 22,2 13,21 11,13"/>
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const IconCheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
);

const IconAlert = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,4 1,10 7,10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconChevronLeft = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);

const IconChevronRight = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
);

const IconMapPin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <polyline points="9,15 12,12 15,15"/>
  </svg>
);

const IconRoute = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
);

// ── Helpers de seção ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em",
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
      {right && right}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
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

  // ── MODO: NAVEGAÇÃO ─────────────────────────────────────────────────────────
  if (mode === "navigating" && currentRow) {
    const isFirst = currentIdx === 0;
    const total = routeRows.length;
    const progress = (currentIdx / total) * 100;
    const color = CLASS_COLOR[currentRow.classificacao];
    const isSemCondo = currentRow.classificacao === "encontrada_sem_condominio";

    return (
      <Layout>
        {ToastComponent}
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {/* Cabeçalho da navegação */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 14, overflow: "hidden", marginBottom: "1rem",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{
              padding: "0.85rem 1.25rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.15rem" }}>
                  {result?.condominio.nome}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
                  Entrega {currentIdx + 1} de {total}
                </div>
              </div>
              <button
                onClick={() => setMode("completed")}
                style={{
                  fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)",
                  background: "none", border: "1px solid var(--border-strong)",
                  borderRadius: 99, padding: "0.35rem 0.8rem", cursor: "pointer",
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
                background: "linear-gradient(90deg, var(--accent) 0%, #9333ea 100%)",
                transition: "width 0.3s ease",
              }} />
            </div>

            {/* Pontos de progresso */}
            <div style={{ padding: "0.6rem 1.25rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
              {routeRows.map((r, i) => {
                const isDone = deliveredLines.has(r.linha);
                const isSkipped = skippedLines.has(r.linha);
                const isCurrent = i === currentIdx;
                return (
                  <div key={r.linha} style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isDone ? "var(--ok)" : isSkipped ? "var(--accent)" : isCurrent ? "var(--text)" : "var(--border-strong)",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }} />
                );
              })}
            </div>
          </div>

          {/* Card de instrução */}
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border-strong)",
            borderRadius: 14,
            padding: "1.4rem 1.25rem",
            marginBottom: "1rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-md)",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, var(--accent) 0%, #9333ea 100%)",
            }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: isFirst ? "var(--ok-dim)" : "var(--accent-dim)",
                border: `1.5px solid ${isFirst ? "var(--ok)" : "var(--accent)"}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isFirst ? "var(--ok)" : "var(--accent)",
                marginTop: "0.1rem",
              }}>
                {isFirst ? <IconGate /> : <IconNavArrow />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: isFirst ? "var(--ok)" : "var(--accent)",
                  marginBottom: "0.4rem",
                }}>
                  {isFirst ? "Ponto de entrada" : "Instrução de navegação"}
                </div>
                <div style={{
                  fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.5,
                  color: "var(--text)",
                }}>
                  {currentRow.instrucao ?? "Siga as instruções do mapa."}
                </div>
              </div>
            </div>
          </div>

          {/* Info da entrega */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 14, padding: "1.1rem 1.25rem",
            marginBottom: "1rem", boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.55rem" }}>
              <div style={{
                fontSize: "1.1rem", fontWeight: 800, color: "var(--text)",
                display: "flex", alignItems: "center", gap: "0.5rem",
                letterSpacing: "-0.01em",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  background: `${color}15`, color, fontSize: "0.75rem", fontWeight: 800,
                  border: `1px solid ${color}25`, flexShrink: 0,
                }}>
                  {currentRow.ordem}
                </span>
                {quadraLoteLabel(currentRow)}
              </div>
              {isSemCondo && (
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
                  color: "#7c3aed", background: "rgba(124,58,237,0.1)", borderRadius: 99,
                  padding: "0.2rem 0.6rem", border: "1px solid rgba(124,58,237,0.2)",
                  flexShrink: 0,
                }}>
                  SEM CONDOMÍNIO
                </span>
              )}
            </div>
            {currentRow.ruaCitada && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.75rem", color: "#7c3aed", fontWeight: 600, marginBottom: "0.4rem",
              }}>
                <IconMapPin />
                {currentRow.ruaCitada}
              </div>
            )}
            <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", lineHeight: 1.5, wordBreak: "break-word" }}>
              {currentRow.enderecoOriginal}
            </div>
          </div>

          {/* Botão ENTREGUE */}
          <button
            onClick={handleEntregue}
            style={{
              width: "100%", padding: "1.1rem",
              background: "var(--ok)",
              color: "#fff", border: "none", borderRadius: 14,
              fontSize: "1rem", fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              boxShadow: "0 4px 16px rgba(26,122,74,0.25)",
              fontFamily: "inherit", marginBottom: "0.6rem",
              letterSpacing: "0.03em",
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <IconCheck />
            ENTREGUE
          </button>

          {/* Botões secundários */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <button
              onClick={handleAnterior}
              disabled={currentIdx === 0}
              style={{
                flex: 1, padding: "0.7rem",
                background: "var(--surface-2)", color: currentIdx === 0 ? "var(--text-faint)" : "var(--text)",
                border: "1px solid var(--border-strong)", borderRadius: 10,
                fontSize: "0.82rem", fontWeight: 600,
                cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                opacity: currentIdx === 0 ? 0.45 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <IconChevronLeft />
              Anterior
            </button>
            <button
              onClick={handlePular}
              style={{
                flex: 1, padding: "0.7rem",
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

          {/* Nuances pendentes */}
          {nuanceRows.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.7rem 1rem", background: "var(--accent-dim)",
              border: "1px solid rgba(212,82,26,0.2)", borderRadius: 10,
              fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500,
            }}>
              <IconAlert />
              {nuanceRows.length} endereço{nuanceRows.length !== 1 ? "s" : ""} não roteado{nuanceRows.length !== 1 ? "s" : ""} (nuance) — verifique manualmente.
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ── MODO: ROTA CONCLUÍDA ───────────────────────────────────────────────────
  if (mode === "completed") {
    const totalEntregues = deliveredLines.size;
    const totalPuladas = skippedLines.size;
    const totalPendentes = routeRows.length - totalEntregues - totalPuladas;

    return (
      <Layout>
        {ToastComponent}
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Card de conclusão */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 20,
            padding: "2.25rem 1.5rem",
            textAlign: "center",
            marginBottom: "1.25rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-md)",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, var(--ok) 0%, #7c3aed 100%)",
            }} />
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--ok-dim)", border: "1.5px solid rgba(26,122,74,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0.25rem auto 1.25rem",
              color: "var(--ok)",
            }}>
              <IconCheckCircle />
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text)", marginBottom: "0.3rem", letterSpacing: "-0.02em" }}>
              Rota finalizada!
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
              {result?.condominio.nome}
            </div>
          </div>

          {/* Métricas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { value: totalEntregues, label: "Entregues", color: "var(--ok)" },
              { value: totalPuladas, label: "Puladas", color: "var(--accent)" },
              { value: nuanceRows.length + totalPendentes, label: "Não roteadas", color: "var(--text-faint)" },
            ].map(({ value, label, color }) => (
              <div key={label} style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, padding: "1rem 0.75rem", textAlign: "center",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: color }} />
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color, marginBottom: "0.2rem", letterSpacing: "-0.02em" }}>{value}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Entregas puladas */}
          {skippedLines.size > 0 && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border-strong)",
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
                  <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>linha {r.linha}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleNovaRota}
            style={{
              width: "100%", padding: "0.85rem",
              background: "var(--text)", color: "var(--bg)",
              border: "none", borderRadius: 12, fontSize: "0.88rem",
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <IconRefresh />
            Nova Rota
          </button>
        </div>
      </Layout>
    );
  }

  // ── MODOS: SETUP / PROCESSING / READY ─────────────────────────────────────
  return (
    <Layout>
      {ToastComponent}

      {/* Cabeçalho da página */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          Ferramentas de Condomínio
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          Roteirização semântica de entregas em condomínios fechados — Nova Califórnia (Tamoios).
        </p>
      </div>

      {/* Seletor de condomínio */}
      {mode !== "ready" && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border-strong)",
          borderRadius: 14, overflow: "hidden", marginBottom: "1.25rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <CardHeader left={<SectionLabel>Condomínio</SectionLabel>} />
          <div style={{
            padding: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.6rem",
          }}>
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
                    textAlign: "left", padding: "0.85rem 1rem",
                    borderRadius: 10,
                    border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border-strong)"}`,
                    background: isActive ? "var(--accent-dim)" : "var(--surface-2)",
                    cursor: isAvail ? "pointer" : "not-allowed",
                    opacity: isAvail ? 1 : 0.5,
                    transition: "all 0.15s",
                    display: "flex", flexDirection: "column", gap: "0.3rem",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{c.nome}</div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: isAvail ? "var(--ok)" : "var(--text-faint)",
                  }}>
                    {isAvail ? `Disponível${c.totalLotes ? ` · ${c.totalLotes} lotes` : ""}` : "Em desenvolvimento"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload / Processing */}
      {(mode === "setup" || mode === "processing") && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border-strong)",
          borderRadius: 14, overflow: "hidden", marginBottom: "1.5rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <CardHeader left={<SectionLabel>Importar planilha — {selected?.nome ?? "—"}</SectionLabel>} />

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "2rem 1.5rem",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "0.75rem", cursor: "pointer",
              border: `2px dashed ${isDragOver || file ? "var(--accent)" : "transparent"}`,
              borderRadius: 10, margin: "0.75rem",
              background: isDragOver ? "var(--accent-dim)" : "transparent",
              transition: "all 200ms",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "var(--accent-dim)", border: "1px solid var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
            }}>
              <IconUpload />
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", textAlign: "center" }}>
              {file ? file.name : "Arraste a planilha aqui"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textAlign: "center" }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'XLSX ou CSV · coluna "Destination Address" · máx 10MB'}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.45rem",
                padding: "0.55rem 1.25rem", borderRadius: 99,
                background: "var(--accent)", color: "#fff",
                fontSize: "0.8rem", fontWeight: 600, border: "none",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(212,82,26,0.3)",
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

          <div style={{ padding: "0 1rem 1rem" }}>
            <button
              onClick={handleProcess}
              disabled={!canProcess}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "0.82rem 1.5rem", borderRadius: 99,
                background: "var(--text)", color: "var(--bg)",
                border: "none", fontSize: "0.9rem", fontWeight: 700,
                cursor: !canProcess ? "not-allowed" : "pointer",
                opacity: !canProcess ? 0.4 : 1,
                transition: "opacity 200ms", fontFamily: "inherit",
              }}
            >
              <IconRoute />
              {isProcessing ? "Processando..." : "Roteirizar Entregas"}
            </button>
          </div>

          {/* Spinner + steps */}
          {isProcessing && (
            <div style={{ padding: "1.25rem 1.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 36, height: 36, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
              <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Filtrando e analisando endereços...</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%", maxWidth: 420 }}>
                {steps.map((step, i) => (
                  <div key={i} className="animate-step-in" style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.72rem", color: "var(--text-faint)" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} className="animate-pulse-dot" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODO READY: resultado + botão iniciar */}
      {mode === "ready" && result && (
        <div className="animate-fade-up">

          {/* Cabeçalho do resultado */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem",
          }}>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
                {result.condominio.nome}
              </div>
              {result.totalOriginal && result.totalOriginal > result.totalLinhas && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "0.15rem" }}>
                  {result.totalLinhas} de {result.totalOriginal} endereços em Nova Califórnia
                </div>
              )}
            </div>
            <button
              onClick={handleNovaRota}
              style={{
                fontSize: "0.72rem", fontWeight: 600, color: "var(--text-faint)",
                background: "none", border: "1px solid var(--border-strong)",
                borderRadius: 99, padding: "0.35rem 0.8rem", cursor: "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.35rem",
              }}
            >
              <IconChevronLeft size={11} />
              Nova planilha
            </button>
          </div>

          {/* Estatísticas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { value: routeRows.length, label: "Para entregar", color: "var(--ok)" },
              { value: result.totalNuances, label: "Nuances", color: "var(--accent)" },
              { value: result.totalLojas, label: "Lojas", color: "#0ea5e9" },
              { value: `${result.metricas.tempo_ms}ms`, label: "Tempo", color: "var(--text-faint)" },
            ].map(({ value, label, color }) => (
              <div key={label} style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, padding: "1rem 0.9rem 0.8rem",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: color }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "0.3rem", color }}>{value}</div>
                <div style={{ fontSize: "0.63rem", color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Aviso de nuances */}
          {nuanceRows.length > 0 && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "0.6rem",
              padding: "0.85rem 1rem", marginBottom: "1rem",
              background: "var(--accent-dim)", border: "1px solid rgba(212,82,26,0.25)",
              borderRadius: 12, fontSize: "0.8rem", color: "var(--accent)", lineHeight: 1.5,
            }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}><IconAlert /></div>
              <span>
                <strong>{nuanceRows.length} endereço{nuanceRows.length !== 1 ? "s" : ""} não roteado{nuanceRows.length !== 1 ? "s" : ""}.</strong>{" "}
                Quadra não identificada — verifique manualmente após a rota.
              </span>
            </div>
          )}

          {/* BOTÃO INICIAR ROTA */}
          {routeRows.length > 0 ? (
            <button
              onClick={handleIniciar}
              style={{
                width: "100%", padding: "1.15rem",
                background: "linear-gradient(135deg, var(--accent) 0%, #9333ea 100%)",
                color: "#fff", border: "none", borderRadius: 14,
                fontSize: "1.05rem", fontWeight: 900, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                boxShadow: "0 6px 24px rgba(212,82,26,0.3)",
                fontFamily: "inherit", marginBottom: "0.85rem",
                letterSpacing: "0.02em",
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <IconPlay />
              INICIAR ROTA ({routeRows.length} entregas)
            </button>
          ) : (
            <div style={{
              padding: "1.25rem", textAlign: "center",
              background: "var(--surface)", border: "1px solid var(--border-strong)",
              borderRadius: 14, color: "var(--text-faint)", fontSize: "0.85rem",
              marginBottom: "0.85rem",
            }}>
              Nenhuma entrega roteável encontrada. Verifique se o arquivo contém endereços deste condomínio.
            </div>
          )}

          {/* Preview da sequência + export */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 14, overflow: "hidden",
          }}>
            <CardHeader
              left={<SectionLabel>Sequência de Entregas</SectionLabel>}
              right={
                <button
                  onClick={exportCsv}
                  style={{
                    padding: "0.35rem 0.75rem", borderRadius: 99,
                    fontSize: "0.7rem", fontWeight: 600,
                    background: "var(--surface-2)", color: "var(--text)",
                    border: "1px solid var(--border-strong)", cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.3rem",
                  }}
                >
                  <IconDownload />
                  CSV
                </button>
              }
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {routeRows.length === 0 && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.8rem" }}>
                  Nenhuma entrega roteável.
                </div>
              )}
              {routeRows.map((r, idx) => {
                const color = CLASS_COLOR[r.classificacao];
                return (
                  <div key={`${r.linha}-${idx}`} style={{
                    padding: "0.85rem 1.25rem",
                    borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                    display: "flex", gap: "0.75rem", alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: `${color}12`, color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: "0.72rem",
                      border: `1px solid ${color}25`,
                      marginTop: 2,
                    }}>
                      {r.ordem}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.15rem" }}>
                        {quadraLoteLabel(r)}
                      </div>
                      {r.instrucao && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <IconNavArrow />
                          {r.instrucao}
                        </div>
                      )}
                      <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", wordBreak: "break-word" }}>
                        {r.enderecoOriginal}
                      </div>
                    </div>
                    {r.classificacao !== "ordenada" && (
                      <span style={{
                        fontSize: "0.6rem", fontWeight: 700, color,
                        background: `${color}12`, borderRadius: 99,
                        padding: "0.2rem 0.5rem", flexShrink: 0, marginTop: 2,
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
                    padding: "0.5rem 1.25rem",
                    background: "var(--accent-dim)", borderTop: "1px solid var(--border)",
                    display: "flex", alignItems: "center", gap: "0.4rem",
                  }}>
                    <IconAlert />
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
                      Não roteadas — verificar manualmente
                    </span>
                  </div>
                  {nuanceRows.map((r, idx) => (
                    <div key={`n-${r.linha}-${idx}`} style={{
                      padding: "0.75rem 1.25rem",
                      borderTop: "1px solid var(--border)",
                      display: "flex", gap: "0.75rem", alignItems: "center",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: "var(--accent-dim)", color: "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(212,82,26,0.2)",
                      }}>
                        <IconAlert />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", wordBreak: "break-word" }}>
                          {r.enderecoOriginal}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.15rem" }}>
                          {r.motivo}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Log de processamento */}
          {doneSteps.length > 0 && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 10 }}>
              {doneSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.68rem", color: "var(--text-faint)", marginBottom: "0.2rem" }}>
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

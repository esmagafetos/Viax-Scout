import React, { useRef, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";

// ── Tipos ─────────────────────────────────────────────────────────────────────

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
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  totalLojas: number;
  detalhes: DeliveryRow[];
  metricas: { tempo_ms: number };
}

interface CondoGroup {
  condoId: string | null;
  condoNome: string | null;
  status: "ativo" | "em_desenvolvimento" | "nao_localizado";
  route?: RouteResult;
  enderecos?: { linha: number; endereco: string }[];
}

interface UnifiedResult {
  totalOriginal: number;
  grupos: CondoGroup[];
}

type UIMode = "setup" | "processing" | "ready" | "navigating" | "completed";
type ManeuverType = "left" | "right" | "straight" | "uturn" | "entry";

// ── Helpers de label ──────────────────────────────────────────────────────────

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

function parseInstrucao(instrucao: string) {
  const isLast = instrucao.includes("Última entrega");
  const sem = instrucao.replace(" Última entrega.", "");
  const dot = sem.indexOf(". ");
  if (dot === -1) return { maneuver: sem.replace(/\.+$/, ""), destino: "", isLastDelivery: isLast };
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

// ── Ícones SVG ────────────────────────────────────────────────────────────────

const IconTurnLeft = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,14 4,9 9,4" /><path d="M20,20 v-7 a4,4 0 0,0-4,-4 H4" />
  </svg>
);
const IconTurnRight = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,14 20,9 15,4" /><path d="M4,20 v-7 a4,4 0 0,1 4,-4 H20" />
  </svg>
);
const IconGoStraight = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="4" /><polyline points="7,9 12,4 17,9" />
  </svg>
);
const IconUTurn = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9,19 V9 a5,5 0 0,1 10,0 v2" /><polyline points="5,15 9,19 13,15" />
  </svg>
);
const IconGate = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="7" height="20" rx="1" /><rect x="14" y="2" width="7" height="20" rx="1" />
    <circle cx="10" cy="12" r="1" fill="currentColor" />
  </svg>
);
const IconUpload = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" /><line x1="12" y1="18" x2="12" y2="12" />
    <polyline points="9,15 12,12 15,15" />
  </svg>
);
const IconRoute = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);
const IconCheck = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);
const IconRefresh = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
  </svg>
);
const IconChevronDown = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 12,15 18,9" />
  </svg>
);
const IconAlertTriangle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconMapPin = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const IconDownload = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

function DirectionIcon({ type, size = 24 }: { type: ManeuverType; size?: number }) {
  switch (type) {
    case "left":     return <IconTurnLeft size={size} />;
    case "right":    return <IconTurnRight size={size} />;
    case "straight": return <IconGoStraight size={size} />;
    case "uturn":    return <IconUTurn size={size} />;
    default:         return <IconGate size={size} />;
  }
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const GRAD = "linear-gradient(135deg, #d4521a 0%, #9333ea 100%)";

// ── Estilos compartilhados ────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 14,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  overflow: "hidden",
  marginBottom: "1rem",
};

const cardHead: React.CSSProperties = {
  padding: "0.75rem 1.25rem",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const labelCap: React.CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

// ── Sub-componente: Linha da tabela de resultados ─────────────────────────────

const CLASS_COLOR: Record<DeliveryRow["classificacao"], string> = {
  ordenada: "var(--ok)",
  encontrada_sem_condominio: "#7c3aed",
  loja: "#0ea5e9",
  nuance: "var(--accent)",
};

const CLASS_LABEL: Record<DeliveryRow["classificacao"], string> = {
  ordenada: "Ordenada",
  encontrada_sem_condominio: "Sem condo",
  loja: "Loja",
  nuance: "Nuance",
};

function ResultRow({ row }: { row: DeliveryRow }) {
  const q = quadraLabel(row);
  const l = loteLabel(row);
  const cor = CLASS_COLOR[row.classificacao];
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.75rem",
      padding: "0.6rem 1.25rem", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 3, borderRadius: 2, alignSelf: "stretch", flexShrink: 0,
        background: cor, minHeight: 20,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", color: "var(--text)", fontWeight: 500, marginBottom: "0.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.enderecoOriginal}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {row.ordem && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-faint)" }}>
              #{row.ordem}
            </span>
          )}
          <span style={{ fontSize: "0.65rem", color: "var(--text-faint)" }}>{q}{l ? ` · ${l}` : ""}</span>
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.5rem",
            borderRadius: 99, background: `${cor}18`, color: cor,
          }}>
            {CLASS_LABEL[row.classificacao]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Card de grupo ativo ────────────────────────────────────────────────────────

function ActiveCondoCard({
  group,
  onIniciar,
  onExport,
}: {
  group: CondoGroup;
  onIniciar: () => void;
  onExport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const route = group.route!;
  const routeRows = useMemo(
    () => route.detalhes.filter((r) => r.ordem != null).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [route],
  );
  const nuanceRows = useMemo(
    () => route.detalhes.filter((r) => r.classificacao === "nuance"),
    [route],
  );

  return (
    <div style={{ ...card, borderLeft: "3px solid var(--ok)" }}>
      <div style={cardHead}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ ...labelCap, color: "var(--ok)" }}>Ativo</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
            {group.condoNome}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={onExport}
            style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.35rem 0.75rem", borderRadius: 99,
              border: "1px solid var(--border-strong)", background: "var(--surface-2)",
              color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
            }}
          >
            <IconDownload size={11} /> CSV
          </button>
          <button
            onClick={onIniciar}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.4rem 1rem", borderRadius: 99,
              border: "none", background: "var(--ok)", color: "#fff",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            <IconRoute size={13} /> Iniciar Rota
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", padding: "0.85rem 1.25rem", flexWrap: "wrap" }}>
        {[
          { label: "Ordenadas", value: route.totalOrdenadas, color: "var(--ok)" },
          { label: "Sem condo", value: route.totalSemCondominio, color: "#7c3aed" },
          { label: "Lojas", value: route.totalLojas, color: "#0ea5e9" },
          { label: "Nuances", value: route.totalNuances, color: "var(--accent)" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center", minWidth: 52 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.15rem" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.55rem 1.25rem", background: "none", border: "none",
          borderTop: "1px solid var(--border)", cursor: "pointer",
          fontSize: "0.72rem", color: "var(--text-faint)", fontFamily: "inherit",
        }}
      >
        <span>Ver {route.totalLinhas} endereço(s)</span>
        <span style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
          <IconChevronDown />
        </span>
      </button>

      {expanded && (
        <div>
          {routeRows.map((r) => <ResultRow key={r.linha} row={r} />)}
          {nuanceRows.map((r) => <ResultRow key={r.linha} row={r} />)}
        </div>
      )}
    </div>
  );
}

// ── Card de grupo em desenvolvimento ─────────────────────────────────────────

function DevCondoCard({ group }: { group: CondoGroup }) {
  const [expanded, setExpanded] = useState(false);
  const count = group.enderecos?.length ?? 0;
  return (
    <div style={{ ...card, borderLeft: "3px solid #d97706" }}>
      <div style={cardHead}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ ...labelCap, color: "#d97706" }}>Em breve</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
            {group.condoNome}
          </span>
        </div>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600,
          padding: "0.2rem 0.6rem", borderRadius: 99,
          background: "rgba(217,119,6,0.1)", color: "#d97706",
        }}>
          {count} endereço(s)
        </span>
      </div>
      <div style={{ padding: "0.85rem 1.25rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
          <div style={{ color: "#d97706", marginTop: "0.1rem", flexShrink: 0 }}>
            <IconAlertTriangle size={14} />
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
            Encontramos <strong>{count} entrega(s)</strong> para <strong>{group.condoNome}</strong>, mas ainda estamos mapeando este condomínio.
            A roteização automática estará disponível em breve.
          </p>
        </div>
      </div>
      {count > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.5rem 1.25rem", background: "none", border: "none",
              borderTop: "1px solid var(--border)", cursor: "pointer",
              fontSize: "0.72rem", color: "var(--text-faint)", fontFamily: "inherit",
            }}
          >
            <span>{expanded ? "Ocultar" : "Ver"} endereços</span>
            <span style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
              <IconChevronDown />
            </span>
          </button>
          {expanded && (
            <div>
              {group.enderecos!.map((e) => (
                <div key={e.linha} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--border)",
                  fontSize: "0.75rem", color: "var(--text-muted)",
                }}>
                  <IconMapPin size={11} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.endereco}
                  </span>
                  <span style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: "0.65rem", flexShrink: 0 }}>
                    linha {e.linha}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Card de não localizado ────────────────────────────────────────────────────

function NaoLocalizadoCard({ group }: { group: CondoGroup }) {
  const [expanded, setExpanded] = useState(false);
  const count = group.enderecos?.length ?? 0;
  return (
    <div style={{ ...card, borderLeft: "3px solid var(--border-strong)" }}>
      <div style={cardHead}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ ...labelCap }}>Não identificado</span>
        </div>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600,
          padding: "0.2rem 0.6rem", borderRadius: 99,
          background: "var(--surface-2)", color: "var(--text-faint)",
        }}>
          {count} endereço(s)
        </span>
      </div>
      <div style={{ padding: "0.85rem 1.25rem 1rem" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", lineHeight: 1.55, margin: 0 }}>
          {count} endereço(s) não foram identificados em nenhum condomínio mapeado.
          Talvez ainda estejamos trabalhando nisso, ou o endereço esteja fora da área de cobertura.
        </p>
      </div>
      {count > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.5rem 1.25rem", background: "none", border: "none",
              borderTop: "1px solid var(--border)", cursor: "pointer",
              fontSize: "0.72rem", color: "var(--text-faint)", fontFamily: "inherit",
            }}
          >
            <span>{expanded ? "Ocultar" : "Ver"} endereços</span>
            <span style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
              <IconChevronDown />
            </span>
          </button>
          {expanded && (
            <div>
              {group.enderecos!.map((e) => (
                <div key={e.linha} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--border)",
                  fontSize: "0.75rem", color: "var(--text-faint)",
                }}>
                  <IconMapPin size={11} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.endereco}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: "0.65rem", flexShrink: 0 }}>
                    linha {e.linha}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [mode, setMode] = useState<UIMode>("setup");

  const [navGroup, setNavGroup] = useState<CondoGroup | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [deliveredLines, setDeliveredLines] = useState<Set<number>>(new Set());
  const [skippedLines, setSkippedLines] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();
  const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";

  const routeRows = useMemo(() => {
    if (!navGroup?.route) return [];
    return navGroup.route.detalhes
      .filter((r) => r.ordem != null)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [navGroup]);

  const currentRow = routeRows[currentIdx] ?? null;
  const addStep = (msg: string) => setSteps((prev) => [...prev.slice(-30), msg]);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      showToast("Formato inválido. Use .xlsx ou .csv");
      return;
    }
    setFile(f);
    setResult(null);
    setSteps([]);
    setMode("setup");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setMode("processing");
    setSteps([]);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
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
              addStep("Processamento concluído.");
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

  const handleIniciarRota = (group: CondoGroup) => {
    setNavGroup(group);
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

  const handleVoltarResultados = () => {
    setNavGroup(null);
    setMode("ready");
  };

  const handleNovaRota = () => {
    setResult(null);
    setFile(null);
    setSteps([]);
    setNavGroup(null);
    setCurrentIdx(0);
    setDeliveredLines(new Set());
    setSkippedLines(new Set());
    setMode("setup");
  };

  const exportCsv = (group: CondoGroup) => {
    if (!group.route) return;
    const header = ["Ordem", "Linha", "Quadra", "Lote", "Classificação", "Confiança%", "Endereço", "Instrução", "Motivo"];
    const rows = group.route.detalhes.map((r) => [
      r.ordem ?? "",
      r.linha,
      r.quadraLetra ?? r.quadra ?? "",
      r.loteId ?? r.lote ?? "",
      CLASS_LABEL[r.classificacao],
      r.confiancaParse ?? "",
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
    a.download = `viax-${group.condoId ?? "rota"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── MODO: NAVEGAÇÃO ───────────────────────────────────────────────────────
  if (mode === "navigating" && currentRow && navGroup) {
    const { maneuver, destino, isLastDelivery } = parseInstrucao(currentRow.instrucao ?? "");
    const maneuverType = detectManeuver(currentRow.instrucao ?? "");
    const total = routeRows.length;
    const progress = ((currentIdx + 1) / total) * 100;

    return (
      <Layout>
        {ToastComponent}
        <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: "2rem" }}>

          <div style={{ ...card, marginBottom: "0.85rem" }}>
            <div style={{ padding: "0.9rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.2rem" }}>
                  {navGroup.condoNome}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text)", letterSpacing: "-0.02em" }}>
                  Entrega {currentIdx + 1}{" "}
                  <span style={{ fontWeight: 500, color: "var(--text-faint)", fontSize: "0.9rem" }}>de {total}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleVoltarResultados}
                  style={{
                    fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)",
                    background: "none", border: "1px solid var(--border-strong)",
                    borderRadius: 99, padding: "0.38rem 0.9rem", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ← Resultados
                </button>
                <button
                  onClick={() => setMode("completed")}
                  style={{
                    fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)",
                    background: "none", border: "1px solid var(--border-strong)",
                    borderRadius: 99, padding: "0.38rem 0.9rem", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Encerrar
                </button>
              </div>
            </div>

            <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
              <div style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: `${progress}%`, background: GRAD,
                transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>

            <div style={{ padding: "0.6rem 1.2rem 0.75rem", display: "flex", gap: "0.28rem", flexWrap: "wrap" }}>
              {routeRows.map((r, i) => {
                const isDone = deliveredLines.has(r.linha);
                const isSkipped = skippedLines.has(r.linha);
                const isCurrent = i === currentIdx;
                return (
                  <div key={r.linha} style={{
                    width: isCurrent ? 20 : 7, height: 7, borderRadius: 99, flexShrink: 0,
                    background: isDone ? "var(--ok)" : isSkipped ? "var(--accent)" : isCurrent ? "#9333ea" : "var(--border-strong)",
                    transition: "all 0.25s ease",
                  }} />
                );
              })}
            </div>
          </div>

          <div style={{ ...card, marginBottom: "0.85rem" }}>
            <div style={{ padding: "1.5rem 1.5rem 0.5rem", display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(212,82,26,0.12) 0%, rgba(147,51,234,0.12) 100%)",
                border: "1.5px solid rgba(212,82,26,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#9333ea",
              }}>
                <DirectionIcon type={maneuverType} size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: "0.3rem" }}>
                  {maneuver}
                </div>
                {destino && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{destino}</div>
                )}
              </div>
            </div>

            <div style={{ margin: "0.75rem 1.5rem", padding: "0.7rem 0.9rem", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)", marginBottom: "0.2rem" }}>
                Endereço
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text)", fontWeight: 500, wordBreak: "break-word" }}>
                {currentRow.enderecoOriginal}
              </div>
              {currentRow.confiancaParse !== undefined && (
                <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", marginTop: "0.2rem" }}>
                  Confiança: {currentRow.confiancaParse}%
                </div>
              )}
            </div>

            {isLastDelivery && (
              <div style={{ margin: "0 1.5rem 0.75rem", padding: "0.55rem 0.9rem", background: "rgba(26,122,74,0.1)", borderRadius: 8, border: "1px solid rgba(26,122,74,0.2)", fontSize: "0.75rem", fontWeight: 600, color: "var(--ok)" }}>
                Última entrega desta rota
              </div>
            )}

            <div style={{ display: "flex", gap: "0.65rem", padding: "0 1.5rem 1.5rem" }}>
              <button
                onClick={handleAnterior}
                disabled={currentIdx === 0}
                style={{
                  padding: "0.65rem 1rem", borderRadius: 99, border: "1px solid var(--border-strong)",
                  background: "var(--surface-2)", color: "var(--text-muted)",
                  fontSize: "0.78rem", fontWeight: 500, cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                  opacity: currentIdx === 0 ? 0.4 : 1, fontFamily: "inherit",
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={handlePular}
                style={{
                  flex: 1, padding: "0.65rem", borderRadius: 99,
                  border: "1px solid var(--accent)", background: "var(--accent-dim)",
                  color: "var(--accent)", fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Pular
              </button>
              <button
                onClick={handleEntregue}
                style={{
                  flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  padding: "0.65rem 1.25rem", borderRadius: 99, border: "none",
                  background: "var(--ok)", color: "#fff", fontSize: "0.82rem", fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <IconCheck size={16} /> Entregue
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── MODO: CONCLUÍDO ───────────────────────────────────────────────────────
  if (mode === "completed") {
    return (
      <Layout>
        {ToastComponent}
        <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: "2rem" }}>
          <div style={{ ...card, textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(26,122,74,0.12)", border: "2px solid rgba(26,122,74,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "var(--ok)" }}>
              <IconCheck size={26} />
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.4rem" }}>
              Rota concluída
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginBottom: "1.5rem" }}>
              {deliveredLines.size} entregue(s) · {skippedLines.size} pulada(s)
            </div>
            <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
              {navGroup && (
                <button
                  onClick={handleVoltarResultados}
                  style={{
                    padding: "0.65rem 1.25rem", borderRadius: 99,
                    border: "1px solid var(--border-strong)", background: "var(--surface-2)",
                    color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ← Ver resultados
                </button>
              )}
              <button
                onClick={handleNovaRota}
                style={{
                  padding: "0.65rem 1.5rem", borderRadius: 99, border: "none",
                  background: "var(--accent)", color: "#fff", fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Nova Rota
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── MODO: CONFIGURAÇÃO + PROCESSAMENTO + RESULTADOS ───────────────────────
  return (
    <Layout>
      {ToastComponent}
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.2rem" }}>
              Ferramenta de Condomínios
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
              Suba a planilha — o sistema identifica os condomínios e roteiriza automaticamente.
            </p>
          </div>
          {(mode === "ready" || result) && (
            <button
              onClick={handleNovaRota}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.5rem 1rem", borderRadius: 99,
                border: "1px solid var(--border-strong)", background: "var(--surface-2)",
                color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <IconRefresh size={13} /> Nova Rota
            </button>
          )}
        </div>

        {/* ── Upload zone ──────────────────────────────────────────────────── */}
        {(mode === "setup" || mode === "processing") && (
          <div style={{ ...card }}>
            <div style={cardHead}>
              <span style={labelCap}>Planilha de entregas</span>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!isProcessing) setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={!isProcessing ? handleDrop : undefined}
                style={{
                  border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--border-strong)"}`,
                  borderRadius: 10,
                  padding: "2rem 1.5rem",
                  textAlign: "center",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  background: isDragOver ? "var(--accent-dim)" : "var(--surface-2)",
                  transition: "all 200ms",
                  marginBottom: file ? "1rem" : 0,
                }}
              >
                <div style={{ color: isDragOver ? "var(--accent)" : "var(--text-faint)", marginBottom: "0.5rem" }}>
                  <IconUpload size={26} />
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  {file ? file.name : "Arraste ou clique para selecionar"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>
                  .xlsx ou .csv · máx 10 MB
                </div>
              </div>

              {file && !isProcessing && (
                <button
                  onClick={handleProcess}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    padding: "0.75rem", borderRadius: 99, border: "none",
                    background: "var(--accent)", color: "#fff",
                    fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(212,82,26,0.28)", fontFamily: "inherit",
                  }}
                >
                  <IconRoute size={15} /> Processar Planilha
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Log de processamento ─────────────────────────────────────────── */}
        {(mode === "processing" || (mode === "ready" && steps.length > 0)) && (
          <div style={{ ...card }}>
            <div style={{ ...cardHead }}>
              <span style={labelCap}>Processamento</span>
              {mode === "processing" && (
                <div style={{ width: 16, height: 16, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
              )}
            </div>
            <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {steps.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                  fontSize: "0.78rem",
                  color: i === steps.length - 1 ? "var(--text)" : "var(--text-faint)",
                  fontWeight: i === steps.length - 1 ? 500 : 400,
                }}>
                  <span style={{ color: "var(--ok)", flexShrink: 0, marginTop: "0.05rem" }}>✓</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Resultados ───────────────────────────────────────────────────── */}
        {mode === "ready" && result && (
          <>
            <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
                <strong style={{ color: "var(--text)" }}>{result.totalOriginal}</strong> endereço(s) processado(s)
                {" · "}
                <strong style={{ color: "var(--text)" }}>{result.grupos.length}</strong> grupo(s) identificado(s)
              </div>
            </div>

            {result.grupos.map((group, i) => {
              if (group.status === "ativo") {
                return (
                  <ActiveCondoCard
                    key={group.condoId ?? i}
                    group={group}
                    onIniciar={() => handleIniciarRota(group)}
                    onExport={() => exportCsv(group)}
                  />
                );
              }
              if (group.status === "em_desenvolvimento") {
                return <DevCondoCard key={group.condoId ?? i} group={group} />;
              }
              return <NaoLocalizadoCard key="nao_loc" group={group} />;
            })}
          </>
        )}

      </div>
    </Layout>
  );
}

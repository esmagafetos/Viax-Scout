import React, { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";

function validateGoogleMapsKey(key: string): string | null {
  if (!key) return "Chave de API é obrigatória para usar o Google Maps.";
  if (!key.startsWith("AIza")) return 'A chave deve começar com "AIza".';
  if (key.length < 35 || key.length > 45) return "Comprimento de chave inválido. Verifique no Google Cloud Console.";
  return null;
}

export default function Setup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [parserMode, setParserMode] = useState<"builtin" | "ai">("builtin");
  const [toleranceMeters, setToleranceMeters] = useState(300);
  const [instanceMode, setInstanceMode] = useState<"builtin" | "geocodebr" | "googlemaps">("builtin");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const updateSettingsMutation = useUpdateSettings();

  const mapsKeyError = keyTouched && instanceMode === "googlemaps" ? validateGoogleMapsKey(googleMapsApiKey) : null;

  const handleContinue = () => {
    if (instanceMode === "googlemaps") {
      setKeyTouched(true);
      const err = validateGoogleMapsKey(googleMapsApiKey);
      if (err) {
        showToast(err);
        return;
      }
    }

    updateSettingsMutation.mutate(
      {
        data: {
          parserMode,
          toleranceMeters,
          instanceMode,
          googleMapsApiKey: instanceMode === "googlemaps" ? googleMapsApiKey : null,
        } as any,
      },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
        onError: () => {
          showToast("Erro ao salvar configurações, mas você pode configurar depois.");
          navigate("/dashboard");
        },
      }
    );
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem",
    borderRadius: 8, border: `1px solid ${mapsKeyError ? "var(--accent)" : "var(--border-strong)"}`,
    background: "var(--surface-2)", color: "var(--text)",
    fontSize: "0.85rem", outline: "none", fontFamily: "Poppins",
    transition: "border-color 0.2s",
  };

  const instances = [
    {
      value: "builtin",
      label: "Padrão Gratuito",
      badge: "Grátis",
      badgeColor: "#16a34a",
      badgeBg: "rgba(22,163,74,0.1)",
      desc: "Photon + Overpass + Nominatim (OSM). Zero custo, sem chave necessária.",
    },
    {
      value: "geocodebr",
      label: "GeocodeR BR",
      badge: "Local",
      badgeColor: "#7c3aed",
      badgeBg: "rgba(124,58,237,0.1)",
      desc: "CNEFE/IBGE via microserviço R local. Máxima precisão para endereços brasileiros.",
    },
    {
      value: "googlemaps",
      label: "Google Maps",
      badge: "Pay-per-use",
      badgeColor: "#1565c0",
      badgeBg: "rgba(21,101,192,0.1)",
      desc: "Google Maps Geocoding API. Alta precisão global. Requer chave de API.",
    },
  ] as const;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        animation: "fadeUp 0.4s ease",
      }}>
        <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--accent)", background: "var(--accent-dim)", padding: "0.2rem 0.6rem", borderRadius: 99, fontWeight: 600, letterSpacing: "0.08em" }}>
              CONFIGURAÇÃO INICIAL
            </span>
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
            Bem-vindo, {user?.name?.split(" ")[0] ?? "usuario"}!
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
            Configure como o ViaX:Trace deve processar seus endereços.
          </p>
        </div>

        <div style={{ padding: "1.5rem 2rem" }}>
          {/* Parser mode */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.75rem" }}>
              Modo de Parser
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {[
                { value: "builtin", label: "Parser Embutido", desc: "Rápido, offline, sem custos extras" },
                { value: "ai", label: "Inteligência Artificial", desc: "Maior precisão com IA externa" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setParserMode(opt.value as "builtin" | "ai")}
                  style={{
                    flex: 1, padding: "0.85rem", borderRadius: 10,
                    border: `1px solid ${parserMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`,
                    background: parserMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 200ms",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: parserMode === opt.value ? "var(--accent)" : "var(--text)", marginBottom: "0.25rem" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Instance mode */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.75rem" }}>
              Motor de Geocodificação
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {instances.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setInstanceMode(opt.value); setKeyTouched(false); }}
                  style={{
                    width: "100%", padding: "0.9rem 1rem", borderRadius: 10, textAlign: "left",
                    border: `1px solid ${instanceMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`,
                    background: instanceMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)",
                    cursor: "pointer", transition: "all 200ms",
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: instanceMode === opt.value ? "var(--accent)" : "var(--text)", marginBottom: "0.2rem" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: 99, background: opt.badgeBg, color: opt.badgeColor, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {opt.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Google Maps key field */}
            {instanceMode === "googlemaps" && (
              <div style={{ marginTop: "0.75rem", padding: "1rem 1.1rem", borderRadius: 10, background: "rgba(21,101,192,0.06)", border: "1px solid rgba(21,101,192,0.2)" }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
                  Chave de API do Google Maps
                </label>
                <input
                  type="password"
                  value={googleMapsApiKey}
                  onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                  onBlur={() => setKeyTouched(true)}
                  placeholder="AIzaSy..."
                  style={inputStyle}
                />
                {mapsKeyError && (
                  <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.35rem" }}>{mapsKeyError}</div>
                )}
                <p style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.4rem", lineHeight: 1.5 }}>
                  Habilite a <strong>Geocoding API</strong> no Google Cloud Console. A chave é armazenada de forma segura.
                </p>
              </div>
            )}

            {/* geocodebr info */}
            {instanceMode === "geocodebr" && (
              <div style={{ marginTop: "0.75rem", padding: "1rem 1.1rem", borderRadius: 10, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-faint)", lineHeight: 1.6, margin: 0 }}>
                    O microserviço <strong>geocodebr</strong> precisa estar rodando localmente (porta 8002). Configure a variável <code style={{ background: "var(--surface-2)", padding: "0 0.3rem", borderRadius: 4 }}>GEOCODEBR_URL</code> no servidor ou ative via Docker. Você pode ajustar isso depois em <strong>Configurações → Instâncias</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tolerance */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.75rem" }}>
              <span>Tolerância de Coordenadas</span>
              <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem" }}>{toleranceMeters}m</span>
            </label>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={toleranceMeters}
              onChange={(e) => setToleranceMeters(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-faint)", marginTop: "0.3rem" }}>
              <span>100m (rigoroso)</span>
              <span>5000m (flexível)</span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: "0.5rem" }}>
              Distância máxima entre a coordenada GPS e o endereço oficial para aceitar como correto.
            </p>
          </div>

          <button
            onClick={handleContinue}
            disabled={updateSettingsMutation.isPending}
            style={{
              width: "100%", padding: "0.75rem",
              borderRadius: 99, border: "none",
              background: "var(--text)", color: "var(--bg)",
              fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", transition: "all 200ms",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {updateSettingsMutation.isPending ? "Salvando..." : "Continuar para o Dashboard"}
          </button>

          <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-faint)" }}
            >
              Pular por agora
            </button>
          </div>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}

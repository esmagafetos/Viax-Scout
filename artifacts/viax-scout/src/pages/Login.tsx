import React, { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/Layout";
import ViaXLogo, { LogoIcon } from "@/components/ViaXLogo";

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: "Validação GPS em tempo real",
    desc: "Compara endereços contra coordenadas reais via geocodificação multi-camada",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Detecção de fraudes e nuances",
    desc: "Identifica discrepâncias entre endereços declarados e posição real do GPS",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/>
      </svg>
    ),
    title: "Importação XLSX e CSV",
    desc: "Processe planilhas de rota em lotes com resultados instantâneos e exportáveis",
  },
];

function RouteDecoration() {
  return (
    <svg
      viewBox="0 0 400 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08, pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M50 80 C50 200 300 200 300 350" stroke="white" strokeWidth="2" strokeDasharray="8 12" strokeLinecap="round"/>
      <path d="M120 30 C120 150 380 250 380 420" stroke="white" strokeWidth="1.5" strokeDasharray="6 10" strokeLinecap="round"/>
      <path d="M200 100 C100 200 200 300 100 420" stroke="white" strokeWidth="1" strokeDasharray="4 8" strokeLinecap="round"/>
      <circle cx="50" cy="80" r="5" fill="white"/>
      <circle cx="300" cy="350" r="8" fill="white" fillOpacity="0.7"/>
      <circle cx="120" cy="30" r="4" fill="white"/>
      <circle cx="380" cy="420" r="7" fill="white" fillOpacity="0.6"/>
      <circle cx="200" cy="100" r="3" fill="white"/>
      <circle cx="100" cy="420" r="6" fill="white" fillOpacity="0.5"/>
      {[60, 130, 200, 270, 340].map((y, i) => (
        <g key={i}>
          <circle cx={30 + i * 80} cy={y} r="2" fill="white" fillOpacity="0.4"/>
          <circle cx={60 + i * 60} cy={y + 30} r="1.5" fill="white" fillOpacity="0.3"/>
        </g>
      ))}
    </svg>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data: any) => {
          setUser(data.user);
          navigate("/dashboard");
        },
        onError: (err: any) => {
          showToast(err?.data?.error ?? "Credenciais inválidas.");
        },
      }
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--bg)",
    }}>
      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: "0 0 52%",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(145deg, #1a0e08 0%, #2d1408 30%, #3d1c0c 60%, #1a0a14 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "2.5rem",
      }} className="login-panel-left">
        <RouteDecoration />

        {/* Accent blobs */}
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,82,26,0.35) 0%, transparent 70%)",
          top: -60, left: -60, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 250, height: 250, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,82,26,0.2) 0%, transparent 70%)",
          bottom: 80, right: -50, pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <ViaXLogo size="lg" dark showTagline />
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem 0" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.3rem 0.8rem", borderRadius: 99,
            background: "rgba(212,82,26,0.2)", border: "1px solid rgba(212,82,26,0.35)",
            marginBottom: "1.25rem", width: "fit-content",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4521a", animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.7rem", color: "#e8a882", fontWeight: 600, letterSpacing: "0.06em" }}>v8.0 · GEOCODIFICAÇÃO MULTI-CAMADA</span>
          </div>

          <h1 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
            fontWeight: 800,
            color: "#f0ede8",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "1rem",
          }}>
            Auditoria de rotas<br />
            <span style={{ color: "#d4521a" }}>com precisão GPS.</span>
          </h1>

          <p style={{
            fontSize: "0.9rem", color: "rgba(240,237,232,0.55)",
            lineHeight: 1.65, maxWidth: 380, marginBottom: "2rem",
          }}>
            Detecte nuances, fraudes e inconsistências entre endereços declarados e coordenadas GPS reais — em segundos.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "0.85rem",
                padding: "0.85rem 1rem",
                background: "rgba(240,237,232,0.04)",
                border: "1px solid rgba(240,237,232,0.07)",
                borderRadius: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: "rgba(212,82,26,0.18)", border: "1px solid rgba(212,82,26,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#d4521a",
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f0ede8", marginBottom: "0.2rem" }}>{f.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.45)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom brand */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {["Photon", "Overpass", "Nominatim", "BrasilAPI", "Google Maps"].map(t => (
              <span key={t} style={{
                fontSize: "0.65rem", color: "rgba(240,237,232,0.3)",
                padding: "0.2rem 0.5rem", borderRadius: 4,
                border: "1px solid rgba(240,237,232,0.1)",
                fontFamily: "monospace",
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 2rem",
        position: "relative",
        background: "var(--bg)",
      }} className="login-panel-right">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            position: "absolute", top: "1.25rem", right: "1.25rem",
            display: "flex", alignItems: "center", gap: "0.35rem",
            padding: "0.35rem 0.8rem", borderRadius: 99,
            border: "1px solid var(--border-strong)",
            background: "var(--surface)", color: "var(--text-muted)",
            fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
          {dark ? "Claro" : "Escuro"}
        </button>

        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="login-mobile-logo" style={{ display: "none", marginBottom: "2rem" }}>
            <ViaXLogo size="md" dark={dark} showTagline />
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
              Acessar conta
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
              Entre com suas credenciais para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                style={{
                  width: "100%", padding: "0.7rem 0.95rem",
                  borderRadius: 10, border: "1.5px solid var(--border-strong)",
                  background: "var(--surface)", color: "var(--text)",
                  fontSize: "0.875rem", outline: "none",
                  transition: "border-color 200ms, box-shadow 200ms",
                }}
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-dim)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "0.7rem 2.8rem 0.7rem 0.95rem",
                    borderRadius: 10, border: "1.5px solid var(--border-strong)",
                    background: "var(--surface)", color: "var(--text)",
                    fontSize: "0.875rem", outline: "none",
                    transition: "border-color 200ms, box-shadow 200ms",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-dim)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: 0,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: "100%", padding: "0.8rem",
                borderRadius: 10, border: "none",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.875rem", fontWeight: 700,
                cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                opacity: loginMutation.isPending ? 0.75 : 1,
                transition: "all 200ms",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                boxShadow: "0 2px 12px rgba(212,82,26,0.35)",
                marginTop: "0.25rem",
              }}
              onMouseEnter={e => { if (!loginMutation.isPending) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; }}
            >
              {loginMutation.isPending ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} className="animate-spin-ring" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
              Ainda não tem conta?{" "}
            </span>
            <a
              href="/register"
              onClick={(e) => { e.preventDefault(); navigate("/register"); }}
              style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
            >
              Criar conta grátis
            </a>
          </div>

          <div style={{ marginTop: "2.5rem", padding: "1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <LogoIcon size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.1rem" }}>ViaX:Trace v8.0</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>Geocodificação 5 camadas · Detecção de nuances avançada</div>
            </div>
          </div>
        </div>
      </div>

      {ToastComponent}

      <style>{`
        @media (max-width: 768px) {
          .login-panel-left { display: none !important; }
          .login-panel-right { padding: 2rem 1.25rem !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

import React, { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/Layout";
import ViaXLogo from "@/components/ViaXLogo";

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
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      {/* Theme toggle */}
      <button
        onClick={toggle}
        style={{
          position: "fixed", top: "1.25rem", right: "1.25rem",
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.4rem 0.85rem", borderRadius: 99,
          border: "1px solid var(--border-strong)",
          background: "var(--surface)", color: "var(--text-muted)",
          fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
          zIndex: 10,
        }}
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
        {dark ? "Claro" : "Escuro"}
      </button>

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo above card */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <ViaXLogo size="md" dark={dark} showTagline />
        </div>

        {/* Card */}
        <div style={{
          width: "100%",
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
          backdropFilter: "blur(12px)",
          overflow: "hidden",
        }}>
          {/* Card header */}
          <div style={{ padding: "1.75rem 2rem 1.25rem", borderBottom: "1px solid var(--border)" }} className="login-card-header">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.2rem" }}>
              Acessar conta
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: "1.5rem 2rem 2rem" }} className="login-card-body">
            <div style={{ marginBottom: "1rem" }}>
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
                  width: "100%", padding: "0.65rem 0.9rem",
                  borderRadius: 8, border: "1px solid var(--border-strong)",
                  background: "var(--surface-2)", color: "var(--text)",
                  fontSize: "0.875rem", outline: "none",
                  transition: "border-color 200ms, box-shadow 200ms",
                }}
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-dim)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
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
                    width: "100%", padding: "0.65rem 2.8rem 0.65rem 0.9rem",
                    borderRadius: 8, border: "1px solid var(--border-strong)",
                    background: "var(--surface-2)", color: "var(--text)",
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
                    position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-faint)", padding: 0,
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
                width: "100%", padding: "0.75rem",
                borderRadius: 99, border: "none",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.85rem", fontWeight: 600,
                cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                opacity: loginMutation.isPending ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                boxShadow: "0 2px 12px rgba(212,82,26,0.3)",
                transition: "all 200ms",
              }}
            >
              {loginMutation.isPending ? (
                <>
                  <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} className="animate-spin-ring" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
                </>
              )}
            </button>

            <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-faint)" }}>
              Ainda não tem conta?{" "}
              <a
                href="/register"
                onClick={(e) => { e.preventDefault(); navigate("/register"); }}
                style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
              >
                Criar conta grátis
              </a>
            </div>
          </form>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}

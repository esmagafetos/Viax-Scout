import React, { useState } from "react";
import { useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/Layout";
import ViaXLogo from "@/components/ViaXLogo";

function validateEmail(email: string): string | null {
  if (!email) return "Email é obrigatório.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return "Formato de email inválido.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Senha é obrigatória.";
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(password)) return "A senha deve conter pelo menos uma letra.";
  if (!/[0-9]/.test(password)) return "A senha deve conter pelo menos um número.";
  return null;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { ok: password.length >= 8, label: "8+ caracteres" },
    { ok: /[A-Za-z]/.test(password), label: "Letra" },
    { ok: /[0-9]/.test(password), label: "Número" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "Símbolo" },
  ];
  const score = checks.filter((c) => c.ok).length;
  const levels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  const colors = ["var(--accent)", "var(--accent)", "#f59e0b", "#22c55e", "#16a34a"];
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.3rem" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 99,
              background: i < score ? colors[score] : "var(--border-strong)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.65rem", color: score >= 3 ? "#22c55e" : "var(--text-faint)" }}>
          {levels[score]}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {checks.map((c) => (
            <span
              key={c.label}
              style={{
                fontSize: "0.6rem",
                color: c.ok ? "#22c55e" : "var(--text-faint)",
                fontWeight: c.ok ? 600 : 400,
              }}
            >
              {c.ok ? "✓" : "·"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const [, navigate] = useLocation();
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { showToast, ToastComponent } = useToast();
  const registerMutation = useRegister();

  const emailError = touched.email ? validateEmail(email) : null;
  const passwordError = touched.password ? validatePassword(password) : null;
  const nameError = touched.name && !name.trim() ? "Nome é obrigatório." : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (!name.trim() || eErr || pErr) {
      showToast(eErr ?? pErr ?? "Preencha todos os campos obrigatórios.");
      return;
    }

    registerMutation.mutate(
      { data: { name, email, password, birthDate: birthDate || null } },
      {
        onSuccess: (data: any) => {
          setUser(data.user);
          navigate("/setup");
        },
        onError: (err: any) => {
          showToast(err?.data?.error ?? "Erro ao criar conta.");
        },
      }
    );
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%", padding: "0.65rem 0.9rem",
    borderRadius: 8,
    border: `1px solid ${hasError ? "var(--accent)" : "var(--border-strong)"}`,
    background: "var(--surface-2)", color: "var(--text)",
    fontSize: "0.85rem", outline: "none",
    transition: "border-color 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <button
        onClick={toggle}
        style={{
          position: "fixed", top: "1.25rem", right: "1.25rem",
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.4rem 0.85rem", borderRadius: 99,
          border: "1px solid var(--border-strong)",
          background: "var(--surface)", color: "var(--text-muted)",
          fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
        }}
      >
        {dark ? "Claro" : "Escuro"}
      </button>

      <div className="register-card" style={{
        width: "100%", maxWidth: 440,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}>
        <div className="register-card-header" style={{ borderBottom: "1px solid var(--border)" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <ViaXLogo size="md" dark={dark} showTagline />
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSubmit} className="register-card-body">
          {/* Nome */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Nome completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              required
              placeholder="Seu nome"
              style={inputStyle(!!nameError)}
            />
            {nameError && <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.3rem" }}>{nameError}</div>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              required
              placeholder="seu@email.com"
              style={inputStyle(!!emailError)}
            />
            {emailError && <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.3rem" }}>{emailError}</div>}
          </div>

          {/* Senha */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              required
              placeholder="Mínimo 8 caracteres"
              style={inputStyle(!!passwordError)}
            />
            <PasswordStrength password={password} />
            {passwordError && <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.3rem" }}>{passwordError}</div>}
          </div>

          {/* Data de nascimento */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Data de nascimento <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              style={inputStyle(false)}
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            style={{
              width: "100%", padding: "0.75rem",
              borderRadius: 99, border: "none",
              background: "var(--accent)", color: "#fff",
              fontSize: "0.85rem", fontWeight: 600,
              cursor: registerMutation.isPending ? "not-allowed" : "pointer",
              opacity: registerMutation.isPending ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {registerMutation.isPending ? "Criando conta..." : "Criar conta"}
          </button>

          <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-faint)" }}>
            Já tem conta?{" "}
            <a
              href="/login"
              onClick={(e) => { e.preventDefault(); navigate("/login"); }}
              style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
            >
              Entrar
            </a>
          </div>
        </form>
      </div>

      {ToastComponent}
    </div>
  );
}

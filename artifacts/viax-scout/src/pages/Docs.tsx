import React, { useState } from "react";
import Layout from "@/components/Layout";
import ViaXLogo, { GitHubBanner } from "@/components/ViaXLogo";
import { Link } from "wouter";

const SECTIONS = [
  {
    id: "o-que-e",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
    ),
    title: "O que é o ViaX:Trace?",
    content: `O ViaX:Trace é um sistema SaaS de auditoria de rotas logísticas. Ele valida planilhas de entrega (XLSX ou CSV) comparando os endereços declarados pelos motoristas com as coordenadas GPS capturadas durante a entrega.

Quando há discrepância entre o endereço informado e a localização real do GPS, o sistema classifica o item como uma <strong>nuance</strong> — que pode indicar erro de digitação, endereço incorreto, ou potencial fraude.`,
  },
  {
    id: "nuance",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    ),
    title: "O que é uma nuance?",
    content: `Uma <strong>nuance</strong> é detectada quando a rua/logradouro informado no endereço de entrega não corresponde (ou corresponde com baixa similaridade) à via real identificada pelas coordenadas GPS.

<strong>Exemplos de nuances:</strong>
• Endereço informa "Rua das Flores, 123" mas o GPS aponta para "Av. Brasil, 123"
• Divergência de nome de bairro ou complemento
• Endereço com erro de grafia que impede correspondência

<strong>Exemplos que NÃO são nuance:</strong>
• "Rua Sinagoga, 49, Travessa B" → GPS na Travessa B (o sistema reconhece padrões de via secundária)
• Variações de siglas como "Av." vs "Avenida" (normalização automática)`,
  },
  {
    id: "como-usar",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <polyline points="9,15 12,12 15,15"/>
      </svg>
    ),
    title: "Como processar uma planilha",
    content: `<strong>1. Prepare o arquivo</strong>
O arquivo deve ser XLSX ou CSV com pelo menos as colunas de <em>endereço</em> e <em>coordenadas GPS</em> (latitude e longitude).

<strong>2. Vá em "Processar Rota"</strong>
No menu de navegação, clique em <em>Processar</em>. Faça upload do arquivo ou arraste-o para a área indicada.

<strong>3. Aguarde o processamento</strong>
O sistema processa cada endereço em tempo real via geocodificação multi-camada. O progresso é exibido em tempo real (SSE).

<strong>4. Revise os resultados</strong>
Cada linha é classificada com:
• ✅ <strong>OK</strong> — Endereço confere com o GPS
• ⚠️ <strong>Nuance</strong> — Discrepância detectada, requer revisão

<strong>5. Exporte o relatório</strong>
Baixe o relatório final em XLSX com todos os resultados e detalhes de similaridade.`,
  },
  {
    id: "formato",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="18" x="3" y="3" rx="2"/>
        <path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>
      </svg>
    ),
    title: "Formato do arquivo",
    content: `O sistema aceita planilhas com as seguintes colunas (case-insensitive):

<strong>Colunas obrigatórias:</strong>
• <code>endereco</code> / <code>endereço</code> / <code>address</code> — Endereço completo da entrega
• <code>latitude</code> / <code>lat</code> — Coordenada de latitude (decimal, ex: -23.5505)
• <code>longitude</code> / <code>lon</code> / <code>lng</code> — Coordenada de longitude (decimal, ex: -46.6333)

<strong>Colunas opcionais (auxiliam na precisão):</strong>
• <code>cidade</code> / <code>city</code>
• <code>bairro</code> / <code>neighborhood</code>
• <code>cep</code>

<strong>Formatos de endereço suportados:</strong>
• <code>Rua das Flores, 123</code>
• <code>Av. Brasil, 456, Ap 12</code>
• <code>Rua Sinagoga, 49, Travessa B (Apt 1)</code>
• <code>Farmácia Bom Jesus - Rua X, 50</code>`,
  },
  {
    id: "geocodificacao",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: "Como funciona a geocodificação",
    content: `O sistema usa uma estratégia de <strong>geocodificação multi-camada</strong> para máxima precisão em endereços brasileiros:

<strong>Camada 1 — Geocodificação reversa (GPS → Rua)</strong>
As coordenadas GPS são convertidas em nome de rua usando:
1. <strong>Photon</strong> — OSM Photon API (rápido, sem rate limit)
2. <strong>Overpass API</strong> — Consulta direta à geometria OSM (preciso)
3. <strong>Nominatim</strong> — Fallback com dados OSM completos

<strong>Camada 2 — Geocodificação direta (Endereço → Coordenada)</strong>
O endereço extraído é geocodificado para verificar distância:
4. <strong>BrasilAPI</strong> — Dados de CEP nacionais
5. <strong>Google Maps</strong> — Fallback premium para casos difíceis

<strong>Normalização inteligente</strong>
Antes da comparação, o sistema normaliza siglas, remove anotações de motoristas, identifica POIs e promove vias secundárias (Travessa, Passagem, etc.) quando o GPS confirma que são a via real de entrega.`,
  },
  {
    id: "faq",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
      </svg>
    ),
    title: "Perguntas frequentes",
    faq: true,
    items: [
      {
        q: "O sistema funciona para cidades pequenas do interior?",
        a: "Sim. O sistema usa múltiplas fontes OSM que têm boa cobertura no Brasil, incluindo cidades do interior. Para endereços muito rurais, a precisão pode ser menor e o sistema indicará confiança reduzida.",
      },
      {
        q: "O que é o limiar de similaridade?",
        a: "O sistema calcula um percentual de correspondência entre o nome da rua informada e o nome oficial obtido pelo GPS. O limiar padrão é 68% — abaixo disso, o item é marcado como nuance. Padrões conhecidos (siglas, vias secundárias) têm tratamento especial.",
      },
      {
        q: "Por que 'Rua Sinagoga, Travessa B' não é mais nuance?",
        a: "O sistema reconhece o padrão brasileiro 'Logradouro de referência, número, Via de entrega'. Quando o GPS confirma que a via de entrega (ex: Travessa B) é a rua real, o endereço é validado automaticamente.",
      },
      {
        q: "Quantos endereços posso processar de uma vez?",
        a: "Não há limite técnico fixo por planilha, mas planilhas com mais de 500 endereços podem levar alguns minutos, pois cada endereço requer consultas a APIs externas. O progresso é exibido em tempo real.",
      },
      {
        q: "Os dados são armazenados com segurança?",
        a: "Sim. Todo o processamento ocorre em nosso servidor seguro. Os arquivos são armazenados de forma criptografada e apenas você tem acesso aos seus resultados.",
      },
    ],
  },
];

interface FaqItemProps {
  q: string;
  a: string;
}

function FaqItem({ q, a }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "1rem 0", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "1rem",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left", color: "var(--text)", fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4 }}>{q}</span>
        <span style={{ flexShrink: 0, color: "var(--text-faint)", transition: "transform 200ms", transform: open ? "rotate(45deg)" : "none" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 0 1rem", fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.65 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState("o-que-e");

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.75rem", borderRadius: 99, background: "var(--accent-dim)", border: "1px solid rgba(212,82,26,0.2)", marginBottom: "0.75rem" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Documentação</span>
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Guia do ViaX:Trace
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-faint)", maxWidth: 560, lineHeight: 1.6 }}>
          Tudo que você precisa saber para auditar rotas logísticas com precisão e eficiência.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "2rem", alignItems: "start" }} className="docs-grid">

        {/* Sidebar */}
        <nav style={{
          position: "sticky", top: 80,
          background: "var(--surface)", border: "1px solid var(--border-strong)",
          borderRadius: 14, padding: "0.75rem", boxShadow: "var(--shadow-sm)",
        }} className="docs-sidebar">
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", padding: "0.35rem 0.5rem 0.75rem" }}>
            Nesta página
          </div>
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.55rem 0.6rem", borderRadius: 8, fontSize: "0.8rem",
                cursor: "pointer", textDecoration: "none", transition: "all 150ms",
                fontWeight: activeSection === s.id ? 600 : 400,
                color: activeSection === s.id ? "var(--accent)" : "var(--text-muted)",
                background: activeSection === s.id ? "var(--accent-dim)" : "transparent",
              }}
            >
              <span style={{ opacity: 0.7, flexShrink: 0 }}>{s.icon}</span>
              {s.title.split("?")[0].split("—")[0].trim()}
            </a>
          ))}

          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>Precisa de ajuda?</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-faint)", lineHeight: 1.5 }}>
              Acesse o painel para processar sua primeira rota agora.
            </div>
            <Link href="/process">
              <button style={{
                marginTop: "0.6rem", width: "100%", padding: "0.45rem",
                borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff",
                fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
              }}>
                Processar rota →
              </button>
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Section header */}
              <div style={{
                padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "var(--surface-2)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: "var(--accent-dim)", border: "1px solid rgba(212,82,26,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent)",
                }}>
                  {section.icon}
                </div>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {section.title}
                </h2>
              </div>

              {/* Section body */}
              <div style={{ padding: "1.5rem" }}>
                {section.faq ? (
                  <div>
                    {section.items!.map((item, i) => (
                      <FaqItem key={i} q={item.q} a={item.a} />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.75 }}
                    dangerouslySetInnerHTML={{
                      __html: (section.content || "")
                        .replace(/\n\n/g, "<br/><br/>")
                        .replace(/\n•/g, "<br/>•")
                        .replace(/\n/g, "<br/>")
                        .replace(/<code>/g, '<code style="background:var(--surface-2);padding:0.1em 0.4em;border-radius:4px;font-family:monospace;font-size:0.85em;">')
                    }}
                  />
                )}
              </div>
            </div>
          ))}

          {/* GitHub Banner */}
          <GitHubBanner />

          {/* Quick nav to app */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem",
          }}>
            {[
              { href: "/process", label: "Processar Rota", desc: "Upload de planilha", icon: "📂" },
              { href: "/history", label: "Histórico", desc: "Ver análises anteriores", icon: "📋" },
              { href: "/settings", label: "Configurações", desc: "Valor por rota, metas", icon: "⚙️" },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <div style={{
                  padding: "1rem", background: "var(--surface)", border: "1px solid var(--border-strong)",
                  borderRadius: 12, cursor: "pointer", transition: "all 150ms",
                  display: "flex", flexDirection: "column", gap: "0.25rem",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.background = "var(--accent-dim)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .docs-grid { grid-template-columns: 1fr !important; }
          .docs-sidebar { position: static !important; }
        }
      `}</style>
    </Layout>
  );
}

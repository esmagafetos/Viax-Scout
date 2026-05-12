import { Router, type IRouter } from "express";
import multer from "multer";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { logger } from "../lib/logger.js";
import {
  listCondos,
  getCondo,
  buildRoute,
  detectCondoId,
  isNovaCaliforniaArea,
  type DetectedCondoInfo,
} from "../lib/condo-maps/index.js";
import type { RouteResult } from "../lib/condo-maps/types.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const MAX_LINHAS = 500;

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Não autenticado." }); return null; }
  return userId;
}

function sendSSE(res: any, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (res.flush) res.flush();
}

function normalizarCabecalho(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lerArquivo(buffer: Buffer): { linha: number; endereco: string }[] {
  const wb = xlsxRead(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });
  if (rows.length < 2) return [];

  const header = rows[0].map((c: any) => normalizarCabecalho(String(c)));
  const aliases = [
    "destination address",
    "endereco destino",
    "endereço destino",
    "endereco",
    "endereço",
    "address",
  ];

  let colEnd = -1;
  for (const a of aliases.map(normalizarCabecalho)) {
    const idx = header.indexOf(a);
    if (idx !== -1) { colEnd = idx; break; }
  }
  if (colEnd === -1) throw new Error('Coluna "Destination Address" não encontrada.');

  const out: { linha: number; endereco: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const e = String(rows[i][colEnd] ?? "").trim();
    if (e) out.push({ linha: i + 1, endereco: e });
  }
  return out;
}

// ── Tipos do resultado unificado ──────────────────────────────────────────────

export interface CondoGroupResult {
  condoId: string | null;
  condoNome: string | null;
  status: "ativo" | "em_desenvolvimento" | "nao_localizado";
  route?: RouteResult;
  enderecos?: { linha: number; endereco: string }[];
}

export interface UnifiedResult {
  totalOriginal: number;
  grupos: CondoGroupResult[];
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

router.get("/condominium/list", (_req, res) => {
  res.json({ condominios: listCondos() });
});

router.post(
  "/condominium/process",
  upload.single("arquivo"),
  async (req, res): Promise<void> => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      if (!req.file) {
        sendSSE(res, "error", { error: "Nenhum arquivo recebido." });
        res.end();
        return;
      }

      const ext = req.file.originalname.split(".").pop()?.toLowerCase();
      if (!["xlsx", "csv"].includes(ext ?? "")) {
        sendSSE(res, "error", { error: "Formato inválido. Use .xlsx ou .csv" });
        res.end();
        return;
      }

      sendSSE(res, "step", { step: "Lendo planilha..." });

      let linhas: { linha: number; endereco: string }[];
      try {
        linhas = lerArquivo(req.file.buffer);
      } catch (e: any) {
        sendSSE(res, "error", { error: e.message ?? "Erro ao ler arquivo." });
        res.end();
        return;
      }

      if (!linhas.length) {
        sendSSE(res, "error", { error: "Nenhum endereço encontrado na planilha." });
        res.end();
        return;
      }

      const totalOriginal = linhas.length;
      if (totalOriginal > MAX_LINHAS) {
        sendSSE(res, "step", {
          step: `⚠️ ${totalOriginal} linhas detectadas — processando as primeiras ${MAX_LINHAS}.`,
        });
        linhas = linhas.slice(0, MAX_LINHAS);
      }

      sendSSE(res, "step", {
        step: `${linhas.length} endereço(s) encontrado(s). Identificando condomínios...`,
      });

      // ── Agrupar endereços por condomínio detectado ────────────────────────
      const KEY_NAO_LOC = "__nao_localizado__";

      const groups = new Map<
        string,
        { info: DetectedCondoInfo | null; enderecos: { linha: number; endereco: string }[] }
      >();

      for (const l of linhas) {
        const detected = detectCondoId(l.endereco);
        let key: string;

        if (detected) {
          key = detected.condoId;
          if (!groups.has(key)) groups.set(key, { info: detected, enderecos: [] });
        } else {
          key = KEY_NAO_LOC;
          if (!groups.has(key)) groups.set(key, { info: null, enderecos: [] });
        }

        groups.get(key)!.enderecos.push(l);
      }

      const groupCount = groups.size;
      sendSSE(res, "step", {
        step: `${groupCount} grupo(s) identificado(s). Roteirizando...`,
      });

      // ── Processar cada grupo ──────────────────────────────────────────────
      const resultGrupos: CondoGroupResult[] = [];

      for (const [key, { info, enderecos }] of groups) {
        if (key === KEY_NAO_LOC || !info) {
          resultGrupos.push({
            condoId: null,
            condoNome: null,
            status: "nao_localizado",
            enderecos,
          });
          sendSSE(res, "step", {
            step: `${enderecos.length} endereço(s) sem condomínio identificado.`,
          });
          continue;
        }

        if (info.status === "em_desenvolvimento") {
          resultGrupos.push({
            condoId: info.condoId,
            condoNome: info.condoNome,
            status: "em_desenvolvimento",
            enderecos,
          });
          sendSSE(res, "step", {
            step: `${info.condoNome}: ${enderecos.length} endereço(s) — condomínio em mapeamento.`,
          });
          continue;
        }

        const condo = getCondo(info.condoId);
        if (!condo || condo.status !== "ativo") {
          resultGrupos.push({
            condoId: info.condoId,
            condoNome: info.condoNome,
            status: "em_desenvolvimento",
            enderecos,
          });
          continue;
        }

        sendSSE(res, "step", {
          step: `${info.condoNome}: roteirizando ${enderecos.length} endereço(s)...`,
        });

        const route = buildRoute(enderecos, condo);

        resultGrupos.push({
          condoId: info.condoId,
          condoNome: info.condoNome,
          status: "ativo",
          route,
        });

        sendSSE(res, "step", {
          step: `${info.condoNome}: ${route.totalOrdenadas} ordenado(s) · ${route.totalNuances} nuance(s).`,
        });
      }

      const unifiedResult: UnifiedResult = { totalOriginal, grupos: resultGrupos };

      logger.info(
        { userId, totalOriginal, grupos: resultGrupos.length },
        "Rota unificada processada",
      );

      sendSSE(res, "result", { result: unifiedResult });
    } catch (e: any) {
      logger.error({ error: e?.message }, "Erro ferramenta condomínio");
      sendSSE(res, "error", { error: "Erro interno: " + (e.message ?? String(e)) });
    } finally {
      res.end();
    }
  },
);

export default router;

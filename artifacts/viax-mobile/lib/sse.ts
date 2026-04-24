import EventSource from "react-native-sse";
import { buildSseUrl, getCookieHeader } from "./api";
import * as FileSystem from "expo-file-system/legacy";

export type SSEHandlers = {
  onStep?: (data: { step: string; progress?: number }) => void;
  onResult?: (data: any) => void;
  onError?: (data: { error: string }) => void;
  onClose?: () => void;
};

function uploadMultipart(opts: {
  url: string;
  fileUri: string;
  fileName: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  onUploadProgress?: (frac: number) => void;
}): { promise: Promise<{ status: number; body: string }>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ status: number; body: string }>((resolve, reject) => {
    xhr.open("POST", opts.url);
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && opts.onUploadProgress) {
        opts.onUploadProgress(ev.loaded / ev.total);
      }
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Falha de rede no upload."));
    xhr.onabort = () => reject(new Error("Upload cancelado."));

    const form = new FormData();
    if (opts.fields) {
      for (const [k, v] of Object.entries(opts.fields)) form.append(k, v);
    }
    form.append("arquivo", {
      uri: opts.fileUri,
      name: opts.fileName,
      type: opts.fileName.toLowerCase().endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    } as any);
    xhr.send(form as any);
  });
  return { promise, cancel: () => xhr.abort() };
}

export function streamSSE(opts: {
  path: string;
  fileUri: string;
  fileName: string;
  fields?: Record<string, string>;
  handlers: SSEHandlers;
  onUploadProgress?: (frac: number) => void;
}): { cancel: () => void } {
  const url = buildSseUrl(opts.path);
  const cookie = getCookieHeader();
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (cookie) headers["Cookie"] = cookie;

  const upload = uploadMultipart({
    url,
    fileUri: opts.fileUri,
    fileName: opts.fileName,
    fields: opts.fields,
    headers,
    onUploadProgress: opts.onUploadProgress,
  });

  let cancelled = false;

  upload.promise.then(({ status, body }) => {
    if (cancelled) return;
    if (status >= 400) {
      let parsed: any = null;
      try { parsed = JSON.parse(body); } catch {}
      opts.handlers.onError?.({ error: parsed?.error ?? `Erro ${status}` });
      opts.handlers.onClose?.();
      return;
    }
    parseSSEStream(body, opts.handlers);
    opts.handlers.onClose?.();
  }).catch((e) => {
    if (cancelled) return;
    opts.handlers.onError?.({ error: e?.message ?? "Falha na requisição." });
    opts.handlers.onClose?.();
  });

  return {
    cancel: () => {
      cancelled = true;
      try { upload.cancel(); } catch {}
    },
  };
}

function parseSSEStream(text: string, handlers: SSEHandlers): void {
  const blocks = text.split(/\n\n/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) continue;
    let data: any = dataLines.join("\n");
    try { data = JSON.parse(data); } catch {}
    if (event === "step") handlers.onStep?.(data);
    else if (event === "result") handlers.onResult?.(data);
    else if (event === "error") handlers.onError?.(data);
  }
}

export { EventSource, FileSystem };

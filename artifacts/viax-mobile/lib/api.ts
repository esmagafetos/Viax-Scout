import { get, set, remove, STORAGE_KEYS } from "./storage";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

class CookieJar {
  private value: string | null = null;
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.value = await get(STORAGE_KEYS.cookies);
    this.loaded = true;
  }

  async set(cookie: string): Promise<void> {
    this.value = cookie;
    await set(STORAGE_KEYS.cookies, cookie);
  }

  async clear(): Promise<void> {
    this.value = null;
    await remove(STORAGE_KEYS.cookies);
  }

  current(): string | null {
    return this.value;
  }

  capture(setCookieHeader: string | null): void {
    if (!setCookieHeader) return;
    const parts = setCookieHeader.split(/,(?=[^;]+=[^;]+)/g);
    const jar = new Map<string, string>();
    if (this.value) {
      for (const seg of this.value.split("; ")) {
        const [k, v] = seg.split("=");
        if (k && v !== undefined) jar.set(k, v);
      }
    }
    for (const part of parts) {
      const head = part.split(";")[0]!.trim();
      const [k, v] = head.split("=");
      if (k && v !== undefined) jar.set(k.trim(), v.trim());
    }
    const flat = Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
    this.value = flat;
    void set(STORAGE_KEYS.cookies, flat);
  }
}

export const cookieJar = new CookieJar();

let baseUrl: string | null = null;

export async function loadBaseUrl(): Promise<string | null> {
  baseUrl = await get(STORAGE_KEYS.serverUrl);
  return baseUrl;
}

export async function setBaseUrl(url: string): Promise<void> {
  const cleaned = url.trim().replace(/\/+$/, "");
  baseUrl = cleaned;
  await set(STORAGE_KEYS.serverUrl, cleaned);
}

export function getBaseUrl(): string | null {
  return baseUrl;
}

export async function clearSession(): Promise<void> {
  await cookieJar.clear();
  await remove(STORAGE_KEYS.user);
}

export type RequestOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  if (!baseUrl) throw new ApiError(0, "URL do servidor não configurada.", null);
  await cookieJar.load();

  const url = `${baseUrl}/api${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers ?? {}) };

  const cookie = cookieJar.current();
  if (cookie) headers["Cookie"] = cookie;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData as unknown as BodyInit;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body,
    signal: opts.signal,
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookieJar.capture(setCookie);

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as any).error === "string")
        ? (parsed as any).error
        : `Erro ${res.status}`;
    throw new ApiError(res.status, msg, parsed);
  }

  return parsed as T;
}

export function buildSseUrl(path: string): string {
  if (!baseUrl) throw new ApiError(0, "URL do servidor não configurada.", null);
  return `${baseUrl}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export function getCookieHeader(): string | null {
  return cookieJar.current();
}

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || '';

/**
 * ── Storage policy ────────────────────────────────────────────────────────
 *  SecureStore  → credentials (session cookie, OAuth tokens). Encrypted.
 *  AsyncStorage → non-sensitive user preferences (API URL, theme mode).
 *                 Plain text but persistent and conventional for RN apps.
 */
const SESSION_KEY = 'viax_session_cookie';
const API_URL_KEY = 'viax_api_url';
/** Legacy key used before migrating from SecureStore → AsyncStorage. */
const LEGACY_API_URL_KEY = 'viax_api_url';

let cachedApiUrl: string = DEFAULT_API_URL;

/* ──────────────────────────────────────────────────────────────────────────
 *  Typed errors
 *
 *  `NetworkError`     — `fetch` rejected (offline, DNS, server unreachable).
 *  `HttpError`        — server responded with a non-2xx status.
 *  `UnauthorizedError`— specifically a 401 (used by the global interceptor).
 * ────────────────────────────────────────────────────────────────────────── */

export class NetworkError extends Error {
  readonly cause?: unknown;
  constructor(message = 'Falha de conexão. Verifique sua internet ou se o servidor está acessível.', cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Sessão expirada. Faça login novamente.', body?: unknown) {
    super(401, message, body);
    this.name = 'UnauthorizedError';
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  401 interceptor — registered by AuthProvider on mount.
 * ────────────────────────────────────────────────────────────────────────── */

type UnauthorizedHandler = (err: UnauthorizedError) => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Register a handler invoked exactly once per 401 response. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  API URL persistence + helpers
 * ────────────────────────────────────────────────────────────────────────── */

function normalizeUrl(raw: string): string {
  let v = raw.trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
  return v.replace(/\/+$/, '');
}

/**
 * One-shot migration: if a previous build saved the API URL via
 * SecureStore, copy it into AsyncStorage and clear the secure copy
 * (SecureStore is overkill for a non-sensitive base URL).
 */
async function migrateLegacyApiUrl(): Promise<string | null> {
  try {
    const legacy = await SecureStore.getItemAsync(LEGACY_API_URL_KEY);
    if (!legacy) return null;
    await AsyncStorage.setItem(API_URL_KEY, legacy);
    await SecureStore.deleteItemAsync(LEGACY_API_URL_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export async function initApiUrl(): Promise<void> {
  try {
    let stored = await AsyncStorage.getItem(API_URL_KEY);
    if (!stored) stored = await migrateLegacyApiUrl();
    if (stored) cachedApiUrl = stored;
  } catch {
    // ignore
  }
}

export function getApiUrl(): string {
  return cachedApiUrl;
}

export function hasApiUrl(): boolean {
  return Boolean(cachedApiUrl);
}

export async function setApiUrl(value: string): Promise<string> {
  const normalized = normalizeUrl(value);
  cachedApiUrl = normalized;
  try {
    if (normalized) await AsyncStorage.setItem(API_URL_KEY, normalized);
    else await AsyncStorage.removeItem(API_URL_KEY);
  } catch {
    // ignore
  }
  return normalized;
}

export async function testApiUrl(value: string): Promise<{ ok: boolean; status?: number; message?: string }> {
  const url = normalizeUrl(value);
  if (!url) return { ok: false, message: 'URL vazia' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${url}/api/healthz`, { method: 'GET', signal: ctrl.signal });
    clearTimeout(t);
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? 'Falha de conexão' };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Session cookie persistence
 * ────────────────────────────────────────────────────────────────────────── */

async function getSession(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

async function setSession(value: string | null): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(SESSION_KEY, value);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function clearSession(): Promise<void> {
  await setSession(null);
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Core request
 * ────────────────────────────────────────────────────────────────────────── */

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getApiUrl();
  if (!base && !path.startsWith('http')) {
    throw new Error('Servidor não configurado. Configure em Ajustes → API.');
  }
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const cookie = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (cookie) headers['Cookie'] = cookie;

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: 'include' });
  } catch (e: any) {
    // Network-layer failure (offline, DNS, refused, aborted before response).
    if (e?.name === 'AbortError') throw e; // let callers handle their own cancellation
    throw new NetworkError(undefined, e);
  }

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    // Pick only the first sid pair; we don't support multi-cookie sessions yet.
    const sid = setCookie.split(';')[0];
    if (sid) await setSession(sid);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg = extractMessage(data) ?? `HTTP ${res.status}`;
    if (res.status === 401) {
      const err = new UnauthorizedError(msg, data);
      // Run interceptor exactly once. Wrap in setTimeout(0) so the call
      // stack of the failing request unwinds before we touch app state.
      if (onUnauthorized) {
        const handler = onUnauthorized;
        setTimeout(() => {
          try { handler(err); } catch { /* ignore */ }
        }, 0);
      }
      throw err;
    }
    throw new HttpError(res.status, msg, data);
  }
  return data as T;
}

/** Uploads an avatar image via multipart/form-data to /api/users/avatar. */
export async function uploadAvatar(localUri: string, mimeType: string, fileName: string): Promise<{ avatarUrl: string }> {
  const base = getApiUrl();
  if (!base) throw new Error('Servidor não configurado.');
  const cookie = await getSession();

  const form = new FormData();
  // React Native FormData accepts { uri, name, type } as a "file"
  form.append('avatar', {
    uri: localUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(`${base}/api/users/avatar`, {
      method: 'POST',
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        Accept: 'application/json',
        // NB: do NOT set Content-Type — RN auto-sets the multipart boundary
      },
      body: form as any,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new NetworkError(undefined, e);
  }

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const sid = setCookie.split(';')[0];
    if (sid) await setSession(sid);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = extractMessage(data) ?? `HTTP ${res.status}`;
    if (res.status === 401) {
      const err = new UnauthorizedError(msg, data);
      if (onUnauthorized) {
        const handler = onUnauthorized;
        setTimeout(() => { try { handler(err); } catch { /* ignore */ } }, 0);
      }
      throw err;
    }
    throw new HttpError(res.status, msg, data);
  }
  return data as { avatarUrl: string };
}

function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.error === 'string') return obj.error;
  return null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

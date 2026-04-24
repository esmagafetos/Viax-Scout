/**
 * API helper layer.
 *
 * The generated client (@workspace/api-client-react) sets `credentials: 'include'`
 * which works for browser cookies. React Native's fetch has NO cookie jar, so we
 * persist the session cookie ourselves in SecureStore and inject it on every
 * request via a `Cookie` header.
 */
import * as SecureStore from 'expo-secure-store';
import { setBaseUrl } from '@workspace/api-client-react';

const COOKIE_KEY = 'viax_session_cookie';
const BASE_URL_KEY = 'viax_base_url';
export const DEFAULT_BASE_URL = 'http://127.0.0.1:8080';

let _sessionCookie: string | null = null;
let _baseUrl: string = DEFAULT_BASE_URL;
let _unauthorizedHandler: (() => void) | null = null;

// ── Public typed errors ────────────────────────────────────────────────────
export class NetworkError extends Error {
  constructor(message?: string) {
    super(message ?? 'Sem conexão. Verifique a rede ou o servidor.');
    this.name = 'NetworkError';
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Sessão expirada. Faça login novamente.', data?: unknown) {
    super(401, message, data);
    this.name = 'UnauthorizedError';
  }
}

// ── Session cookie ─────────────────────────────────────────────────────────
export async function loadSession(): Promise<string | null> {
  if (_sessionCookie) return _sessionCookie;
  try {
    _sessionCookie = await SecureStore.getItemAsync(COOKIE_KEY);
  } catch {
    _sessionCookie = null;
  }
  return _sessionCookie;
}

export async function saveSession(cookie: string | null) {
  _sessionCookie = cookie;
  try {
    if (cookie) await SecureStore.setItemAsync(COOKIE_KEY, cookie);
    else await SecureStore.deleteItemAsync(COOKIE_KEY);
  } catch {
    // Best-effort
  }
}

// ── Base URL ───────────────────────────────────────────────────────────────
export async function loadBaseUrl(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(BASE_URL_KEY);
    if (stored) _baseUrl = stored;
  } catch {}
  setBaseUrl(_baseUrl);
  return _baseUrl;
}

export async function setApiBaseUrl(url: string) {
  _baseUrl = url.replace(/\/+$/, '');
  setBaseUrl(_baseUrl);
  try {
    await SecureStore.setItemAsync(BASE_URL_KEY, _baseUrl);
  } catch {}
}

export function getBaseUrl(): string {
  return _baseUrl;
}

export function getSessionCookieSync(): string | null {
  return _sessionCookie;
}

// ── Unauthorized handler (called on 401 from any request) ─────────────────
export function setUnauthorizedHandler(fn: (() => void) | null) {
  _unauthorizedHandler = fn;
}

// ── Patched fetch ─────────────────────────────────────────────────────────
// We monkey-patch global fetch (RN-side) so the generated orval client
// transparently sends the stored session cookie and we can capture set-cookie
// from auth responses.
const originalFetch = (globalThis as any).fetch.bind(globalThis);

(globalThis as any).fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || {});

  // Inject Cookie if we have one and none provided
  if (_sessionCookie && !headers.has('Cookie') && !headers.has('cookie')) {
    headers.set('Cookie', _sessionCookie);
  }

  let response: Response;
  try {
    response = await originalFetch(input, { ...init, headers });
  } catch (err: any) {
    throw new NetworkError(err?.message);
  }

  // Capture set-cookie on auth endpoints
  const setCookie =
    response.headers.get('set-cookie') ?? response.headers.get('Set-Cookie');
  if (setCookie) {
    // Express-session sends `connect.sid=...; Path=/; HttpOnly`
    // We only want the `name=value` portion.
    const firstPair = setCookie.split(/,\s*(?=[A-Za-z0-9_]+=)/)[0]?.split(';')[0]?.trim();
    if (firstPair) {
      // Don't await — fire and forget
      saveSession(firstPair).catch(() => {});
    }
  }

  if (response.status === 401 && _unauthorizedHandler) {
    // Async clear so the in-flight callsite can still react.
    Promise.resolve().then(() => _unauthorizedHandler?.());
  }

  return response;
};

export async function clearSession() {
  await saveSession(null);
}

// ── Re-exports ─────────────────────────────────────────────────────────────
export { setBaseUrl };

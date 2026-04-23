import * as SecureStore from 'expo-secure-store';

declare const process: { env: Record<string, string | undefined> };

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const SESSION_KEY = 'viax_session_cookie';

export function getApiUrl(): string {
  return API_URL;
}

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

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const cookie = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const sid = setCookie.split(';')[0];
    await setSession(sid);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function clearSession(): Promise<void> {
  await setSession(null);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

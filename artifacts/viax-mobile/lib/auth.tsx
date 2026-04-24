import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, clearSession, cookieJar, getBaseUrl, loadBaseUrl } from "./api";
import { getJSON, remove, setJSON, STORAGE_KEYS } from "./storage";
import type { User } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  serverUrl: string | null;
  refreshUser: () => Promise<User | null>;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; birthDate?: string }) => Promise<User>;
  logout: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState<string | null>(null);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
      await setJSON(STORAGE_KEYS.user, me);
      return me;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setUser(null);
        await remove(STORAGE_KEYS.user);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const url = await loadBaseUrl();
        setServerUrlState(url);
        await cookieJar.load();
        const cached = await getJSON<User>(STORAGE_KEYS.user);
        if (cached) setUser(cached);
        if (url) await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await api<{ user: User }>("/auth/login", { method: "POST", body: { email, password } });
    setUser(res.user);
    await setJSON(STORAGE_KEYS.user, res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; birthDate?: string }): Promise<User> => {
    const res = await api<{ user: User }>("/auth/register", { method: "POST", body: data });
    setUser(res.user);
    await setJSON(STORAGE_KEYS.user, res.user);
    return res.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    await clearSession();
    setUser(null);
  }, []);

  const setServerUrl = useCallback(async (url: string): Promise<void> => {
    const { setBaseUrl } = await import("./api");
    await setBaseUrl(url);
    setServerUrlState(getBaseUrl());
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, loading, serverUrl, refreshUser, login, register, logout, setServerUrl,
  }), [user, loading, serverUrl, refreshUser, login, register, logout, setServerUrl]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

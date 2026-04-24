import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { apiRequest, clearSession, setUnauthorizedHandler } from './api';
import { identifyUser } from './sentry';

type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  birthDate?: string | null;
  createdAt?: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  birthDate?: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async () => {
    try {
      const me = await apiRequest<User>('/api/auth/me');
      setUser(me);
      identifyUser({ id: me.id, email: me.email });
    } catch {
      setUser(null);
      identifyUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  /**
   * Global 401 interceptor: any backend response with status 401 — including
   * a stale session cookie that the server now rejects — clears local
   * credentials and bounces the user back to the login screen, instead of
   * letting screens render in a half-broken authenticated state.
   */
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearSession();
      setUser(null);
      identifyUser(null);
      try { router.replace('/'); } catch { /* router not ready */ }
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const login = async (email: string, password: string) => {
    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await refresh();
  };

  const register = async (data: RegisterPayload) => {
    await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await refresh();
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    await clearSession();
    setUser(null);
    identifyUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

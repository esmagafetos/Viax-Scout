import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  useGetMe,
  useLogout,
  getGetMeQueryKey,
  type User,
} from '@workspace/api-client-react';
import { clearSession, loadBaseUrl, loadSession, setUnauthorizedHandler } from './api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isReady: false,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const logoutMutation = useLogout();

  // Bootstrap: load base URL + cookie before any API call
  useEffect(() => {
    Promise.all([loadBaseUrl(), loadSession()])
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  // Once we have a cookie, ask the server who we are
  const { data, isLoading, error } = useGetMe<User>({
    query: {
      enabled: isReady,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (data) setUser(data);
    if (error) setUser(null);
  }, [data, error]);

  // Global 401 handler: clear session + redirect home
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession().catch(() => {});
      setUser(null);
      queryClient.clear();
      router.replace('/');
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient, router]);

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: async () => {
        await clearSession();
        setUser(null);
        queryClient.clear();
        router.replace('/');
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isReady,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

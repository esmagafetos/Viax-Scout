import 'react-native-gesture-handler';
import '../global.css';

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { ThemeProvider, useColors, useTheme } from '../lib/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { ToastProvider } from '../components/Toast';
import OfflineBanner from '../components/OfflineBanner';
import ErrorBoundary from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Refetch queries when the app comes back into focus (matches web behaviour) ──
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>
                  <ThemedShell />
                </ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function ThemedShell() {
  const c = useColors();
  const { mode } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AuthGate />
      <OfflineBanner />
    </View>
  );
}

// ── Auth gate: route protection ──
function AuthGate() {
  const { isAuthenticated, isLoading, isReady } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady || isLoading) return;
    const inAuthArea = segments[0] === '(tabs)' || segments[0] === 'docs' || segments[0] === 'setup';
    const onLogin = !segments[0] || segments[0] === 'register';

    if (!isAuthenticated && inAuthArea) {
      router.replace('/');
    } else if (isAuthenticated && onLogin) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isLoading, isReady, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="docs" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

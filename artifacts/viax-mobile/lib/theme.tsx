import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nwColorScheme } from 'nativewind';

type Mode = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggle: () => {},
  setMode: () => {},
});

const STORAGE_KEY = 'viax_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    return (Appearance.getColorScheme() as Mode) || 'light';
  });

  // Load persisted mode on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') {
          setModeState(v);
          nwColorScheme.set(v);
        } else {
          nwColorScheme.set(mode);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    nwColorScheme.set(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Raw color tokens that we sometimes need outside of NativeWind classes
// (LinearGradient, SVG, charts).
export const COLORS = {
  light: {
    bg: '#f4f3ef',
    surface: '#faf9f6',
    surface2: '#eeecea',
    text: '#1a1917',
    textMuted: '#6b6860',
    textFaint: '#a09e9a',
    accent: '#d4521a',
    accentDim: 'rgba(212,82,26,0.12)',
    ok: '#1a7a4a',
    okDim: 'rgba(26,122,74,0.10)',
    destructive: '#dc2626',
    border: 'rgba(26,25,23,0.10)',
    borderStrong: 'rgba(26,25,23,0.18)',
  },
  dark: {
    bg: '#121110',
    surface: '#1c1b19',
    surface2: '#242320',
    text: '#f0ede8',
    textMuted: '#8a877f',
    textFaint: '#504d48',
    accent: '#e8703a',
    accentDim: 'rgba(232,112,58,0.13)',
    ok: '#2ea863',
    okDim: 'rgba(46,168,99,0.10)',
    destructive: '#ef4444',
    border: 'rgba(240,237,232,0.08)',
    borderStrong: 'rgba(240,237,232,0.14)',
  },
} as const;

export function useColors() {
  const { mode } = useTheme();
  return COLORS[mode];
}

export const Colors = {
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
    border: 'rgba(26,25,23,0.1)',
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
    border: 'rgba(240,237,232,0.08)',
    borderStrong: 'rgba(240,237,232,0.14)',
  },
};

export const BrandGradient = ['#1a0e08', '#2d1408', '#3d1c0c', '#1f0a18'] as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 99,
};

export type Theme = typeof Colors.light;

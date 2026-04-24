import { useColorScheme } from "react-native";

type HeroTuple = readonly [string, string, string, string];
type HeroLoc = readonly [number, number, number, number];

export type Theme = {
  bg: string; surface: string; surface2: string;
  text: string; textMuted: string; textFaint: string;
  accent: string; accentDim: string;
  ok: string; okDim: string;
  border: string; borderStrong: string;
  shadow: string;
  heroGradient: HeroTuple;
  heroLocations: HeroLoc;
};

export const lightTheme: Theme = {
  bg: "#f4f3ef",
  surface: "#faf9f6",
  surface2: "#eeecea",
  text: "#1a1917",
  textMuted: "#6b6860",
  textFaint: "#a09e9a",
  accent: "#d4521a",
  accentDim: "rgba(212,82,26,0.12)",
  ok: "#1a7a4a",
  okDim: "rgba(26,122,74,0.14)",
  border: "rgba(26,25,23,0.10)",
  borderStrong: "rgba(26,25,23,0.18)",
  shadow: "rgba(0,0,0,0.07)",
  heroGradient: ["#1a0e08", "#2d1408", "#3d1c0c", "#1f0a18"],
  heroLocations: [0, 0.4, 0.7, 1],
};

export const darkTheme: Theme = {
  bg: "#121110",
  surface: "#1c1b19",
  surface2: "#242320",
  text: "#f0ede8",
  textMuted: "#9c9992",
  textFaint: "#6e6c68",
  accent: "#e8703a",
  accentDim: "rgba(232,112,58,0.16)",
  ok: "#3ca86e",
  okDim: "rgba(60,168,110,0.18)",
  border: "rgba(240,237,232,0.10)",
  borderStrong: "rgba(240,237,232,0.18)",
  shadow: "rgba(0,0,0,0.4)",
  heroGradient: ["#0a0604", "#1a0a04", "#2a1208", "#10060e"],
  heroLocations: [0, 0.4, 0.7, 1],
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}

export const radii = { sm: 8, md: 10, lg: 14, xl: 20, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32 };

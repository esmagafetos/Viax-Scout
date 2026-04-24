import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "@/lib/theme";

export function LogoIcon({ size = 28, color, accent }: { size?: number; color?: string; accent?: string }) {
  const t = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M7 7C7 7 7 16 14 18C20 20 21 21 21 21" stroke={color ?? t.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={7} cy={7} r={2.5} fill={color ?? t.text} />
      <Circle cx={21} cy={21} r={4.5} fill={accent ?? t.accent} />
      <Circle cx={21} cy={21} r={1.8} fill="white" />
    </Svg>
  );
}

const SIZES = {
  sm: { icon: 18, name: 14, tagline: 9, gap: 6 },
  md: { icon: 24, name: 17, tagline: 9, gap: 9 },
  lg: { icon: 32, name: 22, tagline: 11, gap: 11 },
  xl: { icon: 48, name: 32, tagline: 13, gap: 16 },
} as const;

export default function ViaXLogo({
  size = "md",
  dark = false,
  showTagline = true,
}: { size?: "sm" | "md" | "lg" | "xl"; dark?: boolean; showTagline?: boolean }) {
  const t = useTheme();
  const s = SIZES[size];
  const textColor = dark ? "#f0ede8" : t.text;
  const muted = dark ? "rgba(240,237,232,0.45)" : "rgba(26,25,23,0.4)";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: s.gap }}>
      <LogoIcon size={s.icon} color={textColor} accent={t.accent} />
      <View style={{ flexDirection: "column" }}>
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: s.name, color: textColor, letterSpacing: -0.3, lineHeight: s.name * 1.1 }}>ViaX</Text>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: s.name, color: muted, lineHeight: s.name * 1.1 }}>:</Text>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: s.name, color: textColor, letterSpacing: -0.3, lineHeight: s.name * 1.1 }}>Trace</Text>
        </View>
        {showTagline && (
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: s.tagline, color: muted, letterSpacing: 1.4, marginTop: 1 }}>
            AUDITORIA LOGÍSTICA
          </Text>
        )}
      </View>
    </View>
  );
}

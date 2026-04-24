import React from "react";
import { View, Text, type ViewStyle } from "react-native";
import { useTheme, radii } from "@/lib/theme";

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: ViewStyle; padded?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[{
        backgroundColor: t.surface,
        borderColor: t.borderStrong,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: padded ? 16 : 0,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }, style]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 1.2, textTransform: "uppercase" }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

export function StatTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.surface,
        borderColor: t.borderStrong,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: 14,
        minWidth: 140,
      }}
    >
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 10, color: t.textFaint, letterSpacing: 1.2, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 24, color: accent ? t.accent : t.text, marginTop: 6, letterSpacing: -0.5 }}>
        {value}
      </Text>
      {hint && (
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 2 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "ok" | "accent" }) {
  const t = useTheme();
  const tones = {
    neutral: { bg: t.surface2, fg: t.textMuted },
    ok: { bg: t.okDim, fg: t.ok },
    accent: { bg: t.accentDim, fg: t.accent },
  }[tone];
  return (
    <View style={{ backgroundColor: tones.bg, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: tones.fg, letterSpacing: 0.2 }}>{label}</Text>
    </View>
  );
}

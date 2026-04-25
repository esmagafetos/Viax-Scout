import React from "react";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import { LogoIcon } from "@/components/Logo";
import { lightTheme, darkTheme } from "@/lib/theme";

/**
 * Splash/loading screen shown while fonts are loading or auth is resolving.
 * Uses only inline SVG (no Poppins) so it renders before fonts are ready.
 * Theme follows the system light/dark preference automatically.
 */
export default function SplashLoader() {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? darkTheme : lightTheme;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <View style={{ alignItems: "center", gap: 14 }}>
        <LogoIcon size={72} color={t.text} accent={t.accent} />

        <View style={{ alignItems: "center", gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text
              style={{
                color: t.text,
                fontSize: 28,
                fontWeight: "700",
                letterSpacing: -0.6,
              }}
            >
              ViaX
            </Text>
            <Text
              style={{
                color: t.textFaint,
                fontSize: 28,
                fontWeight: "400",
              }}
            >
              :
            </Text>
            <Text
              style={{
                color: t.text,
                fontSize: 28,
                fontWeight: "700",
                letterSpacing: -0.6,
              }}
            >
              Trace
            </Text>
          </View>

          <Text
            style={{
              color: t.textFaint,
              fontSize: 10,
              fontWeight: "500",
              letterSpacing: 2.4,
            }}
          >
            AUDITORIA LOGÍSTICA
          </Text>
        </View>
      </View>

      <ActivityIndicator color={t.accent} size="small" />
    </View>
  );
}

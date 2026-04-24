import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/lib/theme";

export default function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 24, color: t.text, letterSpacing: -0.6 }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 13, color: t.textFaint, marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

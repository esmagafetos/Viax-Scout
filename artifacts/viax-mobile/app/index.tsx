import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import ViaXLogo from "@/components/Logo";

export default function Index() {
  const { loading, serverUrl, user } = useAuth();
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg, gap: 24 }}>
        <ViaXLogo size="lg" />
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  if (!serverUrl) return <Redirect href="/setup" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}

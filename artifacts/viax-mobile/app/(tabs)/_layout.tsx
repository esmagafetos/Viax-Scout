import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  const { user, serverUrl, loading } = useAuth();

  if (loading) return null;
  if (!serverUrl) return <Redirect href="/setup" />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textFaint,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.borderStrong,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 86 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 10,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="processar"
        options={{
          title: "Processar",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "cloud-upload" : "cloud-upload-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ferramenta"
        options={{
          title: "Ferramenta",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "construct" : "construct-outline"} size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "time" : "time-outline"} size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "settings" : "settings-outline"} size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

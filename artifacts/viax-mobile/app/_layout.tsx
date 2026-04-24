import "../global.css";
import "react-native-gesture-handler";
import "react-native-reanimated";

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from "@expo-google-fonts/poppins";
import { useColorScheme, View } from "react-native";

import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/Toast";
import { lightTheme, darkTheme } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? darkTheme : lightTheme;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style={scheme === "dark" ? "light" : "dark"} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: t.bg },
                  animation: "fade",
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="setup" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

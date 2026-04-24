import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radii } from "@/lib/theme";

type ToastKind = "info" | "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };
type Ctx = { show: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setToasts((curr) => [...curr, { id, message, kind }]);
    setTimeout(() => setToasts((curr) => curr.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 12, left: 0, right: 0, alignItems: "center", gap: 8, zIndex: 1000 }}>
        {toasts.map((toast) => {
          const palette =
            toast.kind === "success" ? { bg: t.ok, fg: "#fff" } :
            toast.kind === "error" ? { bg: t.accent, fg: "#fff" } :
            { bg: t.text, fg: t.bg };
          return (
            <Animated.View key={toast.id} entering={SlideInUp.duration(200)} exiting={FadeOut.duration(200)}>
              <Pressable onPress={() => setToasts((c) => c.filter((x) => x.id !== toast.id))}>
                <View style={{ backgroundColor: palette.bg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.pill, maxWidth: 340 }}>
                  <Text style={{ color: palette.fg, fontFamily: "Poppins_500Medium", fontSize: 13 }}>{toast.message}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

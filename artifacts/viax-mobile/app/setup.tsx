import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/lib/auth";
import { useTheme, radii } from "@/lib/theme";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ViaXLogo from "@/components/Logo";
import { useToast } from "@/components/Toast";

export default function SetupScreen() {
  const t = useTheme();
  const router = useRouter();
  const { setServerUrl, serverUrl } = useAuth();
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState(serverUrl ?? "https://");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalize = (raw: string) => {
    let s = raw.trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    return s.replace(/\/+$/, "");
  };

  const testConnection = async () => {
    const cleaned = normalize(url);
    if (!cleaned || cleaned === "https://") {
      setError("Informe a URL do servidor.");
      return;
    }
    setError(null);
    setTesting(true);
    try {
      await setServerUrl(cleaned);
      const r = await api<{ ok: boolean }>("/healthz");
      if (r && (r as any).ok !== false) {
        setTested(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        show("Conexão estabelecida.", "success");
      } else {
        throw new Error("Resposta inesperada.");
      }
    } catch (e: any) {
      setTested(false);
      setError(e?.message ?? "Não foi possível conectar.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  };

  const proceed = async () => {
    if (!tested) {
      await testConnection();
      return;
    }
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient
        colors={t.heroGradient as unknown as readonly [string, string, ...string[]]}
        locations={t.heroLocations as unknown as readonly [number, number, ...number[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24, paddingBottom: 40, paddingHorizontal: 22 }}
      >
        <ViaXLogo size="md" dark />
        <Text style={{ color: "#f0ede8", fontFamily: "Poppins_800ExtraBold", fontSize: 26, marginTop: 22, letterSpacing: -0.6 }}>
          Configurar servidor
        </Text>
        <Text style={{ color: "rgba(240,237,232,0.65)", fontFamily: "Poppins_400Regular", fontSize: 13, marginTop: 8, lineHeight: 19 }}>
          Informe o endereço do seu servidor ViaX:Trace para começar a auditar suas entregas.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 32, gap: 18 }}>
          <Input
            label="URL do servidor"
            placeholder="https://api.suaempresa.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={url}
            onChangeText={(v) => { setUrl(v); setTested(false); setError(null); }}
            error={error}
            hint="Ex: https://api.viax.com.br ou http://192.168.0.10:8080"
          />

          <Button
            label={testing ? "Testando..." : tested ? "Conexão validada" : "Testar conexão"}
            variant={tested ? "secondary" : "outline"}
            loading={testing}
            fullWidth
            onPress={testConnection}
          />

          <Button
            label="Continuar"
            variant="primary"
            fullWidth
            disabled={!tested}
            onPress={proceed}
          />

          <View style={{ marginTop: 8, padding: 14, backgroundColor: t.surface2, borderRadius: radii.md, borderWidth: 1, borderColor: t.borderStrong }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.textMuted, marginBottom: 6, letterSpacing: 0.4 }}>
              DICA
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, lineHeight: 18 }}>
              Você pode trocar o servidor a qualquer momento em Configurações.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

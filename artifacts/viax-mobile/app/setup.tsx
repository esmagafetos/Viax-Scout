import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/lib/auth";
import { useTheme, radii } from "@/lib/theme";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ViaXLogo from "@/components/Logo";
import { useToast } from "@/components/Toast";

const QUICK_URLS = [
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "http://10.0.2.2:8080",
];

type Diagnostic = {
  triedUrl: string;
  errorName: string;
  errorMessage: string;
  hint: string;
} | null;

function classifyError(e: any, url: string): { hint: string; userMsg: string } {
  const raw: string = e?.message ?? String(e ?? "");
  if (/network request failed/i.test(raw)) {
    return {
      userMsg: "Servidor inacessível.",
      hint:
        "Cleartext HTTP bloqueado pelo Android ou Termux não está respondendo nessa URL. " +
        "Reconstrua o APK após a correção (eas build) e confirme que o servidor responde no navegador do mesmo aparelho.",
    };
  }
  if (/abort|timeout/i.test(raw)) {
    return {
      userMsg: "Tempo esgotado ao conectar.",
      hint: "O servidor está lento ou bloqueado. Verifique se a porta 8080 não está em uso por outro processo.",
    };
  }
  if (/json|unexpected/i.test(raw)) {
    return {
      userMsg: "Resposta inválida do servidor.",
      hint: `A URL ${url} respondeu mas não com JSON do ViaX:Trace. Confirme que é o backend correto.`,
    };
  }
  return {
    userMsg: e?.message ?? "Falha desconhecida.",
    hint: "Toque em uma das URLs sugeridas abaixo para testar.",
  };
}

export default function SetupScreen() {
  const t = useTheme();
  const router = useRouter();
  const { setServerUrl, serverUrl } = useAuth();
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState(serverUrl ?? "");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Diagnostic>(null);

  const normalize = (raw: string): string => {
    let s = raw.trim().replace(/\/+$/, "");
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) {
      return s.replace(/^(https?:\/\/)localhost(:\d+)?/i, (_, proto, port) => `${proto}127.0.0.1${port ?? ""}`);
    }
    const hostPart = s.split("/")[0]!.split(":")[0]!.toLowerCase();
    const isLocal =
      hostPart === "localhost" ||
      /^127\./.test(hostPart) ||
      /^10\./.test(hostPart) ||
      /^192\.168\./.test(hostPart) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostPart);
    const proto = isLocal ? "http" : "https";
    const normalized = s.replace(/^localhost(:\d+)?/i, (_, port) => `127.0.0.1${port ?? ""}`);
    return `${proto}://${normalized}`;
  };

  const runTest = async (rawUrl: string) => {
    const cleaned = normalize(rawUrl);
    if (!cleaned) {
      setDiagnostic({
        triedUrl: "",
        errorName: "EmptyURL",
        errorMessage: "Informe a URL do servidor.",
        hint: "Use a URL exibida no terminal do Termux, ex.: http://127.0.0.1:8080",
      });
      return;
    }
    setDiagnostic(null);
    setTesting(true);
    try {
      await setServerUrl(cleaned);
      const r = await api<{ status: string }>("/healthz");
      if (r && (r as any).status !== undefined) {
        setTested(true);
        setUrl(cleaned);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        show("Conexão estabelecida.", "success");
      } else {
        throw new Error("Resposta inesperada do servidor.");
      }
    } catch (e: any) {
      setTested(false);
      const { userMsg, hint } = classifyError(e, cleaned);
      setDiagnostic({
        triedUrl: cleaned,
        errorName: e?.name ?? "Error",
        errorMessage: userMsg,
        hint,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  };

  const proceed = async () => {
    if (!tested) {
      await runTest(url);
      return;
    }
    router.replace("/(auth)/login");
  };

  const errorBlock = useMemo(() => {
    if (!diagnostic) return null;
    return (
      <View
        style={{
          marginTop: 4,
          padding: 16,
          backgroundColor: "rgba(239,68,68,0.06)",
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.30)",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 13, color: "#dc2626", letterSpacing: 0.3 }}>
            FALHA NA CONEXÃO
          </Text>
        </View>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text }}>
          {diagnostic.errorMessage}
        </Text>
        {diagnostic.triedUrl ? (
          <View
            style={{
              backgroundColor: t.surface,
              borderRadius: radii.sm,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: t.textFaint, letterSpacing: 0.2 }}>
              URL TESTADA
            </Text>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12.5, color: t.text, marginTop: 2 }} selectable>
              {diagnostic.triedUrl}
            </Text>
          </View>
        ) : null}
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, lineHeight: 18 }}>
          {diagnostic.hint}
        </Text>
      </View>
    );
  }, [diagnostic, t]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient
        colors={t.heroGradient as unknown as readonly [string, string, ...string[]]}
        locations={t.heroLocations as unknown as readonly [number, number, ...number[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24, paddingBottom: 44, paddingHorizontal: 22 }}
      >
        <ViaXLogo size="md" dark />
        <Text
          style={{
            color: "#f0ede8",
            fontFamily: "Poppins_800ExtraBold",
            fontSize: 28,
            marginTop: 24,
            letterSpacing: -0.7,
            lineHeight: 34,
          }}
        >
          Configurar servidor
        </Text>
        <Text
          style={{
            color: "rgba(240,237,232,0.62)",
            fontFamily: "Poppins_400Regular",
            fontSize: 13.5,
            marginTop: 10,
            lineHeight: 20,
            maxWidth: 320,
          }}
        >
          Cole a URL exibida pelo Termux. O app valida a conexão antes de prosseguir.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 32, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              padding: 16,
              backgroundColor: t.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: t.border,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: radii.sm,
                  backgroundColor: t.accentDim,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="terminal" size={14} color={t.accent} />
              </View>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 12, color: t.accent, letterSpacing: 0.5 }}>
                COMO INICIAR O SERVIDOR
              </Text>
            </View>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12.5, color: t.textMuted, lineHeight: 20 }}>
              <Text style={{ color: t.text, fontFamily: "Poppins_600SemiBold" }}>1.</Text> Abra o Termux no mesmo aparelho.{"\n"}
              <Text style={{ color: t.text, fontFamily: "Poppins_600SemiBold" }}>2.</Text> Execute:{"  "}
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: t.text }}>
                bash ~/viax-system/start-backend.sh
              </Text>
              {"\n"}
              <Text style={{ color: t.text, fontFamily: "Poppins_600SemiBold" }}>3.</Text> Cole a URL exibida e toque em{" "}
              <Text style={{ color: t.text, fontFamily: "Poppins_600SemiBold" }}>Testar conexão</Text>.
            </Text>
          </View>

          <Input
            label="URL do servidor"
            placeholder="http://127.0.0.1:8080"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={url}
            onChangeText={(v) => {
              setUrl(v);
              setTested(false);
              setDiagnostic(null);
            }}
            hint="Use http:// para servidor local. Nunca use https:// em conexão Termux."
          />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {QUICK_URLS.map((q) => (
              <Pressable
                key={q}
                onPress={() => {
                  setUrl(q);
                  setTested(false);
                  setDiagnostic(null);
                  void Haptics.selectionAsync();
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: url === q ? t.accent : t.border,
                  backgroundColor: url === q ? t.accentDim : t.surface,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 11.5,
                    color: url === q ? t.accent : t.textMuted,
                  }}
                >
                  {q.replace("http://", "")}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 10, marginTop: 4 }}>
            <Button
              label={testing ? "Testando…" : tested ? "Conexão validada ✓" : "Testar conexão"}
              variant={tested ? "secondary" : "primary"}
              loading={testing}
              fullWidth
              onPress={() => runTest(url)}
            />
            <Button
              label="Continuar"
              variant={tested ? "primary" : "outline"}
              fullWidth
              disabled={!tested}
              onPress={proceed}
            />
          </View>

          {errorBlock}

          <View
            style={{
              marginTop: 4,
              padding: 14,
              backgroundColor: t.surface2,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11.5, color: t.textMuted, letterSpacing: 0.5, marginBottom: 6 }}>
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

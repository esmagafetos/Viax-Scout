import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/lib/auth";
import { useTheme, radii } from "@/lib/theme";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ViaXLogo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/lib/api";

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, serverUrl } = useAuth();
  const { show } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errPwd, setErrPwd] = useState<string | null>(null);

  const submit = async () => {
    setErrEmail(null); setErrPwd(null);
    if (!email.trim()) { setErrEmail("Informe seu e-mail."); return; }
    if (!password) { setErrPwd("Informe sua senha."); return; }
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof ApiError ? e.message : "Falha ao entrar.";
      show(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={t.heroGradient as unknown as readonly [string, string, ...string[]]}
            locations={t.heroLocations as unknown as readonly [number, number, ...number[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 28, paddingHorizontal: 22, paddingBottom: 60 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <ViaXLogo size="md" dark />
              <Pressable onPress={() => router.push("/setup")} hitSlop={12}>
                <Ionicons name="settings-outline" size={20} color="rgba(240,237,232,0.65)" />
              </Pressable>
            </View>
            <Text style={{ color: "#f0ede8", fontFamily: "Poppins_800ExtraBold", fontSize: 28, marginTop: 28, letterSpacing: -0.6 }}>
              Bem-vindo de volta
            </Text>
            <Text style={{ color: "rgba(240,237,232,0.65)", fontFamily: "Poppins_400Regular", fontSize: 13, marginTop: 8, lineHeight: 19 }}>
              Acesse sua conta para auditar entregas, comparar rotas e gerar relatórios.
            </Text>
          </LinearGradient>

          <View style={{
            backgroundColor: t.surface,
            marginTop: -28,
            marginHorizontal: 18,
            borderRadius: radii.xl,
            padding: 22,
            gap: 14,
            borderWidth: 1,
            borderColor: t.borderStrong,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}>
            <Input
              label="E-mail"
              placeholder="voce@empresa.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              error={errEmail}
              leftIcon={<Ionicons name="mail-outline" size={16} color={t.textFaint} />}
            />
            <Input
              label="Senha"
              placeholder="••••••••"
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              error={errPwd}
              leftIcon={<Ionicons name="lock-closed-outline" size={16} color={t.textFaint} />}
              rightAdornment={
                <Pressable onPress={() => setShowPwd((v) => !v)} hitSlop={10}>
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={t.textFaint} />
                </Pressable>
              }
            />
            <Button label="Entrar" variant="primary" fullWidth loading={submitting} onPress={submit} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
              <Text style={{ fontFamily: "Poppins_400Regular", color: t.textFaint, fontSize: 13 }}>Ainda não tem conta?</Text>
              <Pressable onPress={() => router.push("/(auth)/register")}>
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: t.accent, fontSize: 13 }}>Cadastre-se</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: insets.bottom + 16 }}>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, textAlign: "center" }}>
              Servidor: {serverUrl ?? "—"}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

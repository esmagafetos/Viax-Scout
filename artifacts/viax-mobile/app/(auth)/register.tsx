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

export default function RegisterScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { show } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Informe seu nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "E-mail inválido.";
    if (password.length < 6) errs.password = "Mínimo de 6 caracteres.";
    if (password !== confirm) errs.confirm = "As senhas não coincidem.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show("Conta criada!", "success");
      router.replace("/(tabs)");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof ApiError ? e.message : "Falha no cadastro.";
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
            style={{ paddingTop: insets.top + 24, paddingHorizontal: 22, paddingBottom: 56 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable onPress={() => router.back()} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color="#f0ede8" />
              </Pressable>
              <ViaXLogo size="md" dark showTagline={false} />
            </View>
            <Text style={{ color: "#f0ede8", fontFamily: "Poppins_800ExtraBold", fontSize: 26, marginTop: 22, letterSpacing: -0.6 }}>
              Criar conta
            </Text>
            <Text style={{ color: "rgba(240,237,232,0.65)", fontFamily: "Poppins_400Regular", fontSize: 13, marginTop: 6 }}>
              Comece a auditar suas entregas em poucos minutos.
            </Text>
          </LinearGradient>

          <View style={{
            backgroundColor: t.surface, marginTop: -28, marginHorizontal: 18, borderRadius: radii.xl,
            padding: 20, gap: 12, borderWidth: 1, borderColor: t.borderStrong,
            shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
          }}>
            <Input label="Nome" placeholder="Seu nome completo" value={name} onChangeText={setName} error={errors.name ?? null}
              leftIcon={<Ionicons name="person-outline" size={16} color={t.textFaint} />} />
            <Input label="E-mail" placeholder="voce@empresa.com" autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" value={email} onChangeText={setEmail} error={errors.email ?? null}
              leftIcon={<Ionicons name="mail-outline" size={16} color={t.textFaint} />} />
            <Input label="Senha" placeholder="Mín. 6 caracteres" secureTextEntry={!showPwd}
              autoCapitalize="none" value={password} onChangeText={setPassword} error={errors.password ?? null}
              leftIcon={<Ionicons name="lock-closed-outline" size={16} color={t.textFaint} />}
              rightAdornment={
                <Pressable onPress={() => setShowPwd((v) => !v)} hitSlop={10}>
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={t.textFaint} />
                </Pressable>
              }
            />
            <Input label="Confirmar senha" placeholder="Repita a senha" secureTextEntry={!showPwd}
              autoCapitalize="none" value={confirm} onChangeText={setConfirm} error={errors.confirm ?? null}
              leftIcon={<Ionicons name="lock-closed-outline" size={16} color={t.textFaint} />} />
            <Button label="Criar conta" variant="primary" fullWidth loading={submitting} onPress={submit} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Text style={{ fontFamily: "Poppins_400Regular", color: t.textFaint, fontSize: 13 }}>Já tem conta?</Text>
              <Pressable onPress={() => router.replace("/(auth)/login")}>
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: t.accent, fontSize: 13 }}>Entrar</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

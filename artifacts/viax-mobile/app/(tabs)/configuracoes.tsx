import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, Pill } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ScreenHeader from "@/components/ScreenHeader";
import ViaXLogo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import type { User, UserSettings } from "@/lib/types";

export default function ConfiguracoesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser, logout, serverUrl } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  useEffect(() => { setName(user?.name ?? ""); setEmail(user?.email ?? ""); }, [user]);

  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<UserSettings>("/users/settings") });
  const [parserMode, setParserMode] = useState<"builtin" | "google">("builtin");
  const [tolerance, setTolerance] = useState<number>(300);
  const [googleKey, setGoogleKey] = useState("");
  useEffect(() => {
    if (settings.data) {
      setParserMode(settings.data.parserMode);
      setTolerance(settings.data.toleranceMeters);
      setGoogleKey(settings.data.googleApiKey ?? "");
    }
  }, [settings.data]);

  const saveProfile = useMutation({
    mutationFn: () => api<User>("/users/profile", { method: "PUT", body: { name: name.trim(), email: email.trim().toLowerCase() } }),
    onSuccess: async () => { show("Perfil atualizado.", "success"); await refreshUser(); },
    onError: (e) => show(e instanceof ApiError ? e.message : "Erro ao salvar.", "error"),
  });

  const savePwd = useMutation({
    mutationFn: () => api("/users/password", { method: "PUT", body: { currentPassword: pwdCurrent, newPassword: pwdNew } }),
    onSuccess: () => { show("Senha alterada.", "success"); setPwdCurrent(""); setPwdNew(""); setPwdConfirm(""); },
    onError: (e) => show(e instanceof ApiError ? e.message : "Erro ao trocar senha.", "error"),
  });

  const saveSettings = useMutation({
    mutationFn: () => api("/users/settings", {
      method: "PUT",
      body: { parserMode, toleranceMeters: tolerance, googleApiKey: googleKey || null },
    }),
    onSuccess: () => { show("Preferências salvas.", "success"); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e) => show(e instanceof ApiError ? e.message : "Erro ao salvar.", "error"),
  });

  const onChangeAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { show("Permissão negada.", "error"); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
      base64: false,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    try {
      const form = new FormData();
      form.append("avatar", { uri: asset.uri, name: "avatar.jpg", type: "image/jpeg" } as any);
      await api("/users/avatar", { method: "POST", formData: form });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show("Avatar atualizado.", "success");
      await refreshUser();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Erro ao enviar avatar.", "error");
    }
  };

  const onChangePassword = () => {
    if (pwdNew.length < 6) { show("Senha mínima de 6 caracteres.", "error"); return; }
    if (pwdNew !== pwdConfirm) { show("Senhas não coincidem.", "error"); return; }
    savePwd.mutate();
  };

  const confirmLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  };

  const changeServer = () => {
    Alert.alert("Trocar servidor", "Você será desconectado para configurar um novo servidor.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Continuar", onPress: async () => { await logout(); router.replace("/setup"); } },
    ]);
  };

  const avatarUrl = user?.avatarUrl ? (user.avatarUrl.startsWith("http") ? user.avatarUrl : `${serverUrl}${user.avatarUrl}`) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 18, paddingBottom: insets.bottom + 96 }}>
      <ScreenHeader title="Configurações" subtitle="Perfil, preferências e segurança" />

      <Card style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={onChangeAvatar} hitSlop={8}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64 }} />
              ) : (
                <Ionicons name="person" size={28} color={t.textFaint} />
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: t.text }}>{user?.name ?? "—"}</Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, marginTop: 2 }}>{user?.email ?? ""}</Text>
            <Pressable onPress={onChangeAvatar} style={{ marginTop: 6 }}>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.accent }}>Alterar foto</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Perfil" />
        <View style={{ gap: 10 }}>
          <Input label="Nome" value={name} onChangeText={setName} />
          <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button label="Salvar perfil" variant="primary" loading={saveProfile.isPending} onPress={() => saveProfile.mutate()} />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Preferências de auditoria" />
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text }}>Parser Google</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 2 }}>Usa a API do Google Maps para parsing.</Text>
            </View>
            <Switch
              value={parserMode === "google"}
              onValueChange={(v) => setParserMode(v ? "google" : "builtin")}
              trackColor={{ false: t.surface2, true: t.accent }}
              thumbColor="#fff"
            />
          </View>

          {parserMode === "google" && (
            <Input label="Google API Key" value={googleKey} onChangeText={setGoogleKey} autoCapitalize="none" secureTextEntry />
          )}

          <View>
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
              Tolerância: <Text style={{ color: t.text, fontFamily: "Poppins_600SemiBold" }}>{tolerance}m</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[100, 200, 300, 500, 1000].map((m) => (
                <Pressable key={m} onPress={() => { setTolerance(m); void Haptics.selectionAsync(); }}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: radii.pill, alignItems: "center",
                    backgroundColor: tolerance === m ? t.accent : t.surface2,
                    borderWidth: 1, borderColor: tolerance === m ? t.accent : t.borderStrong,
                  }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: tolerance === m ? "#fff" : t.textMuted }}>{m}m</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Button label="Salvar preferências" variant="primary" loading={saveSettings.isPending} onPress={() => saveSettings.mutate()} />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Segurança" />
        <View style={{ gap: 10 }}>
          <Input label="Senha atual" value={pwdCurrent} onChangeText={setPwdCurrent} secureTextEntry autoCapitalize="none" />
          <Input label="Nova senha" value={pwdNew} onChangeText={setPwdNew} secureTextEntry autoCapitalize="none" hint="Mín. 6 caracteres" />
          <Input label="Confirmar nova senha" value={pwdConfirm} onChangeText={setPwdConfirm} secureTextEntry autoCapitalize="none" />
          <Button label="Alterar senha" variant="secondary" loading={savePwd.isPending} onPress={onChangePassword} />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Servidor" />
        <View style={{ gap: 8 }}>
          <View style={{ padding: 10, backgroundColor: t.surface2, borderRadius: radii.md, borderWidth: 1, borderColor: t.borderStrong }}>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, letterSpacing: 0.4, textTransform: "uppercase" }}>URL atual</Text>
            <Text numberOfLines={1} style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text, marginTop: 4 }}>{serverUrl ?? "—"}</Text>
          </View>
          <Button label="Trocar servidor" variant="outline" leftIcon={<Ionicons name="swap-horizontal" size={16} color={t.text} />} onPress={changeServer} />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Button label="Sair da conta" variant="danger" fullWidth leftIcon={<Ionicons name="log-out-outline" size={16} color={t.accent} />} onPress={confirmLogout} />
      </Card>

      <View style={{ alignItems: "center", marginTop: 12, gap: 8 }}>
        <ViaXLogo size="sm" showTagline={false} />
        <Pill label="v2.0.0" tone="neutral" />
      </View>
    </ScrollView>
  );
}

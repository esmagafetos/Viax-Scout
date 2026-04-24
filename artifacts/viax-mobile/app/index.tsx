import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { MotiView } from 'moti';
import { useLogin, type AuthResponse } from '@workspace/api-client-react';

import ViaXLogo from '../components/ViaXLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input, PasswordInput } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useColors, useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useTheme();
  const c = useColors();
  const { setUser } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const loginMutation = useLogin();

  const validateEmail = (v: string) => {
    if (!v) return 'Email é obrigatório.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Formato inválido.';
    return null;
  };

  const handleSubmit = () => {
    const err = validateEmail(email);
    setEmailErr(err);
    if (err) return;
    if (!password) {
      showToast('Senha é obrigatória.');
      return;
    }
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data: AuthResponse) => {
          setUser(data.user);
          router.replace('/(tabs)/dashboard');
        },
        onError: (e: any) => {
          const msg = e?.data?.error ?? e?.message ?? 'Email ou senha inválidos.';
          showToast(msg);
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top bar with theme toggle */}
      <View
        style={{
          position: 'absolute',
          top: 50,
          right: 16,
          zIndex: 10,
        }}
      >
        <ThemeToggle />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380 }}
          style={{ alignItems: 'center', marginBottom: 24 }}
        >
          <ViaXLogo size="xl" dark={mode === 'dark'} showTagline />
        </MotiView>

        <Card animate delay={120} style={{ alignSelf: 'center', width: '100%', maxWidth: 420 }}>
          <View style={{ paddingHorizontal: 22, paddingVertical: 22 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: c.text, marginBottom: 4 }}>
              Bem-vindo de volta
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginBottom: 20 }}>
              Entre na sua conta para auditar suas rotas.
            </Text>

            <View style={{ gap: 14 }}>
              <Input
                label="Email"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailErr) setEmailErr(null);
                }}
                onBlur={() => setEmailErr(validateEmail(email))}
                placeholder="seu@email.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                error={emailErr}
                returnKeyType="next"
              />
              <PasswordInput
                label="Senha"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <View style={{ height: 18 }} />

            <Button
              label="Entrar"
              onPress={handleSubmit}
              loading={loginMutation.isPending}
              iconRight="arrow-forward"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 18 }}>
              <Text style={{ fontSize: 12, color: c.textFaint, fontFamily: 'Poppins_400Regular' }}>
                Não tem conta?
              </Text>
              <Link href="/register" asChild>
                <Pressable accessibilityRole="link">
                  <Text style={{ fontSize: 12, color: c.accent, fontFamily: 'Poppins_600SemiBold' }}>Criar conta</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </Card>

        <Text style={{ textAlign: 'center', color: c.textFaint, fontSize: 10, marginTop: 18, fontFamily: 'Poppins_400Regular' }}>
          ViaX:Trace · Auditoria de Rotas
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

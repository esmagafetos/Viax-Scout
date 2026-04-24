import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { MotiView } from 'moti';
import { useRegister, type AuthResponse } from '@workspace/api-client-react';

import ViaXLogo from '../components/ViaXLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input, PasswordInput, PasswordStrength } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useColors, useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

function validateEmail(v: string): string | null {
  if (!v) return 'Email é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Formato de email inválido.';
  return null;
}

function validatePassword(p: string): string | null {
  if (!p) return 'Senha é obrigatória.';
  if (p.length < 8) return 'Mínimo 8 caracteres.';
  if (!/[A-Za-z]/.test(p)) return 'Inclua pelo menos uma letra.';
  if (!/[0-9]/.test(p)) return 'Inclua pelo menos um número.';
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { mode } = useTheme();
  const c = useColors();
  const { setUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const registerMutation = useRegister();

  const nameErr = touched.name && !name.trim() ? 'Nome é obrigatório.' : null;
  const emailErr = touched.email ? validateEmail(email) : null;
  const passwordErr = touched.password ? validatePassword(password) : null;

  const handleSubmit = () => {
    setTouched({ name: true, email: true, password: true });
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (!name.trim() || eErr || pErr) {
      showToast(eErr ?? pErr ?? 'Preencha todos os campos.');
      return;
    }
    registerMutation.mutate(
      { data: { name, email, password } },
      {
        onSuccess: (data: AuthResponse) => {
          setUser(data.user);
          router.replace('/setup');
        },
        onError: (e: any) => {
          showToast(e?.data?.error ?? 'Erro ao criar conta.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ position: 'absolute', top: 50, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 90, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380 }}
          style={{ alignItems: 'center', marginBottom: 20 }}
        >
          <ViaXLogo size="lg" dark={mode === 'dark'} showTagline />
        </MotiView>

        <Card animate delay={100} style={{ alignSelf: 'center', width: '100%', maxWidth: 440 }}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: c.text, marginBottom: 2 }}>
              Criar conta
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginBottom: 18 }}>
              Comece a auditar suas rotas em segundos.
            </Text>

            <View style={{ gap: 14 }}>
              <Input
                label="Nome completo"
                value={name}
                onChangeText={setName}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder="Seu nome"
                error={nameErr}
                autoComplete="name"
                returnKeyType="next"
              />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="seu@email.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                error={emailErr}
                returnKeyType="next"
              />
              <View>
                <PasswordInput
                  label="Senha"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="password-new"
                  error={passwordErr}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <PasswordStrength password={password} />
              </View>
            </View>

            <View style={{ height: 18 }} />

            <Button
              label="Criar conta"
              onPress={handleSubmit}
              loading={registerMutation.isPending}
              iconRight="arrow-forward"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 16 }}>
              <Text style={{ fontSize: 12, color: c.textFaint, fontFamily: 'Poppins_400Regular' }}>
                Já tem conta?
              </Text>
              <Link href="/" asChild>
                <Pressable accessibilityRole="link">
                  <Text style={{ fontSize: 12, color: c.accent, fontFamily: 'Poppins_600SemiBold' }}>Entrar</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

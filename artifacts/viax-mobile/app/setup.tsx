import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useUpdateSettings, type UpdateSettingsBody } from '@workspace/api-client-react';

import { Card } from '../components/ui/Card';
import { PasswordInput } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useColors } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

type ParserMode = 'builtin' | 'ai';
type InstanceMode = 'builtin' | 'geocodebr' | 'googlemaps';

function validateGoogleMapsKey(key: string): string | null {
  if (!key) return 'Chave de API é obrigatória.';
  if (!key.startsWith('AIza')) return 'A chave deve começar com "AIza".';
  if (key.length < 35 || key.length > 45) return 'Comprimento de chave inválido.';
  return null;
}

const INSTANCES: {
  value: InstanceMode;
  label: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  desc: string;
}[] = [
  {
    value: 'builtin',
    label: 'Padrão Gratuito',
    badge: 'GRÁTIS',
    badgeColor: '#16a34a',
    badgeBg: 'rgba(22,163,74,0.12)',
    desc: 'Photon + Overpass + Nominatim (OSM). Zero custo, sem chave necessária.',
  },
  {
    value: 'geocodebr',
    label: 'GeocodeR BR',
    badge: 'LOCAL',
    badgeColor: '#7c3aed',
    badgeBg: 'rgba(124,58,237,0.12)',
    desc: 'CNEFE/IBGE via microserviço R local. Máxima precisão para endereços brasileiros.',
  },
  {
    value: 'googlemaps',
    label: 'Google Maps',
    badge: 'PAY',
    badgeColor: '#1565c0',
    badgeBg: 'rgba(21,101,192,0.12)',
    desc: 'Google Maps Geocoding API. Alta precisão global. Requer chave de API.',
  },
];

export default function SetupScreen() {
  const router = useRouter();
  const c = useColors();
  const { user } = useAuth();
  const { showToast } = useToast();
  const update = useUpdateSettings();

  const [parserMode, setParserMode] = useState<ParserMode>('builtin');
  const [tolerance, setTolerance] = useState(300);
  const [instance, setInstance] = useState<InstanceMode>('builtin');
  const [gKey, setGKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);

  const keyErr = keyTouched && instance === 'googlemaps' ? validateGoogleMapsKey(gKey) : null;

  const handleContinue = () => {
    if (instance === 'googlemaps') {
      setKeyTouched(true);
      const err = validateGoogleMapsKey(gKey);
      if (err) {
        showToast(err);
        return;
      }
    }
    const body: UpdateSettingsBody = {
      parserMode,
      toleranceMeters: tolerance,
      // The API schema only knows builtin / googlemaps
      instanceMode: (instance === 'geocodebr' ? 'builtin' : instance) as any,
      googleMapsApiKey: instance === 'googlemaps' ? gKey : null,
    };
    update.mutate(
      { data: body },
      {
        onSuccess: () => router.replace('/(tabs)/dashboard'),
        onError: () => {
          showToast('Erro ao salvar, mas você pode configurar depois.');
          router.replace('/(tabs)/dashboard');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 70, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card animate>
          {/* Header */}
          <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: c.accentDim,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 1.2 }}>
                CONFIGURAÇÃO INICIAL
              </Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, color: c.text, letterSpacing: -0.4 }}>
              Bem-vindo, {user?.name?.split(' ')[0] ?? 'usuário'}!
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginTop: 4 }}>
              Configure como o ViaX:Trace deve processar seus endereços.
            </Text>
          </View>

          {/* Body */}
          <View style={{ padding: 20 }}>
            {/* Parser mode */}
            <Section title="Modo de Parser">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { value: 'builtin' as ParserMode, label: 'Embutido', desc: 'Rápido, offline, sem custos.' },
                  { value: 'ai' as ParserMode, label: 'IA', desc: 'Maior precisão com IA externa.' },
                ].map((opt) => {
                  const active = parserMode === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setParserMode(opt.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: active ? c.accent : c.borderStrong,
                        backgroundColor: active ? c.accentDim : c.surface2,
                      }}
                    >
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: active ? c.accent : c.text, marginBottom: 2 }}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: c.textFaint }}>{opt.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            {/* Instance mode */}
            <Section title="Motor de Geocodificação">
              <View style={{ gap: 8 }}>
                {INSTANCES.map((opt) => {
                  const active = instance === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setInstance(opt.value);
                        setKeyTouched(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: active ? c.accent : c.borderStrong,
                        backgroundColor: active ? c.accentDim : c.surface2,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: active ? c.accent : c.text, marginBottom: 3 }}>
                          {opt.label}
                        </Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: c.textFaint, lineHeight: 16 }}>{opt.desc}</Text>
                      </View>
                      <View style={{ backgroundColor: opt.badgeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ color: opt.badgeColor, fontSize: 9, fontFamily: 'Poppins_700Bold', letterSpacing: 0.6 }}>
                          {opt.badge}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {instance === 'googlemaps' && (
                <MotiView
                  from={{ opacity: 0, translateY: -4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{
                    marginTop: 10,
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: 'rgba(21,101,192,0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(21,101,192,0.2)',
                  }}
                >
                  <PasswordInput
                    label="Chave de API do Google Maps"
                    value={gKey}
                    onChangeText={setGKey}
                    onBlur={() => setKeyTouched(true)}
                    placeholder="AIzaSy..."
                    error={keyErr}
                    autoCapitalize="none"
                  />
                  <Text style={{ fontSize: 10, color: c.textFaint, marginTop: 8, lineHeight: 14 }}>
                    Habilite a Geocoding API no Google Cloud Console. A chave é armazenada de forma segura.
                  </Text>
                </MotiView>
              )}

              {instance === 'geocodebr' && (
                <MotiView
                  from={{ opacity: 0, translateY: -4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{
                    marginTop: 10,
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: 'rgba(124,58,237,0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(124,58,237,0.2)',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#7c3aed" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 11, color: c.textFaint, lineHeight: 16 }}>
                    O microserviço <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>geocodebr</Text> precisa estar rodando localmente (porta 8002). Você pode ajustar isso depois em Configurações.
                  </Text>
                </MotiView>
              )}
            </Section>

            {/* Tolerance */}
            <Section title="Tolerância de Coordenadas" trailing={`${tolerance}m`} trailingColor={c.accent}>
              <Slider
                minimumValue={100}
                maximumValue={5000}
                step={100}
                value={tolerance}
                onValueChange={setTolerance}
                minimumTrackTintColor={c.accent}
                maximumTrackTintColor={c.borderStrong}
                thumbTintColor={c.accent}
                style={{ width: '100%', height: 32 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, color: c.textFaint }}>100m (rigoroso)</Text>
                <Text style={{ fontSize: 10, color: c.textFaint }}>5000m (flexível)</Text>
              </View>
              <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 6 }}>
                Distância máxima entre a coordenada GPS e o endereço oficial para aceitar como correto.
              </Text>
            </Section>

            <Button
              label="Continuar para o Dashboard"
              onPress={handleContinue}
              loading={update.isPending}
              variant="dark"
              iconRight="arrow-forward"
            />

            <Pressable
              onPress={() => router.replace('/(tabs)/dashboard')}
              style={{ alignSelf: 'center', marginTop: 12 }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 11, color: c.textFaint, fontFamily: 'Poppins_500Medium' }}>Pular por agora</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  trailing,
  trailingColor,
  children,
}: {
  title: string;
  trailing?: string;
  trailingColor?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: c.textFaint, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          {title}
        </Text>
        {trailing && (
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: trailingColor ?? c.text }}>{trailing}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

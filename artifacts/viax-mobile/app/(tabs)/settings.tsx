import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { MotiView } from 'moti';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetSettings,
  useUpdateProfile,
  useUpdatePassword,
  useUpdateSettings,
  getGetSettingsQueryKey,
  getGetMeQueryKey,
  type UserSettings,
  type User,
} from '@workspace/api-client-react';
import { Card } from '../../components/ui/Card';
import { Input, PasswordInput } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { getBaseUrl, getSessionCookieSync, loadSession } from '../../lib/api';

type Tab = 'perfil' | 'financeiro' | 'instancias' | 'parser' | 'tolerancia' | 'sobre';
type InstanceMode = 'builtin' | 'geocodebr' | 'googlemaps';

const TABS: { id: Tab; label: string }[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'instancias', label: 'Instâncias' },
  { id: 'parser', label: 'Parser' },
  { id: 'tolerancia', label: 'Tolerância' },
  { id: 'sobre', label: 'Sobre' },
];

const CICLO_OPTS = [
  { value: 7, label: 'Semanal (7 dias)' },
  { value: 14, label: 'Quinzenal (14 dias)' },
  { value: 30, label: 'Mensal (30 dias)' },
];

export default function SettingsScreen() {
  const c = useColors();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('perfil');

  const settingsQ = useGetSettings<UserSettings>({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const settings: any = settingsQ.data;

  // Profile
  const [name, setName] = useState(user?.name ?? '');
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Settings (mirrors web state)
  const [parserMode, setParserMode] = useState<'builtin' | 'ai'>('builtin');
  const [aiProvider, setAiProvider] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [toleranceMeters, setToleranceMeters] = useState(300);
  const [instanceMode, setInstanceMode] = useState<InstanceMode>('builtin');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapsKeyTouched, setMapsKeyTouched] = useState(false);
  const [valorPorRota, setValorPorRota] = useState('');
  const [cicloPagamentoDias, setCicloPagamentoDias] = useState(30);
  const [metaMensalRotas, setMetaMensalRotas] = useState('');
  const [despesasFixasMensais, setDespesasFixasMensais] = useState('');

  useEffect(() => {
    if (settings) {
      setParserMode(settings.parserMode ?? 'builtin');
      setAiProvider(settings.aiProvider ?? '');
      setAiApiKey(settings.aiApiKey ?? '');
      setToleranceMeters(settings.toleranceMeters ?? 300);
      setInstanceMode((settings.instanceMode ?? 'builtin') as InstanceMode);
      setGoogleMapsApiKey(settings.googleMapsApiKey ?? '');
      setValorPorRota(settings.valorPorRota != null ? String(settings.valorPorRota) : '');
      setCicloPagamentoDias(settings.cicloPagamentoDias ?? 30);
      setMetaMensalRotas(settings.metaMensalRotas != null ? String(settings.metaMensalRotas) : '');
      setDespesasFixasMensais(settings.despesasFixasMensais != null ? String(settings.despesasFixasMensais) : '');
    }
  }, [settings]);

  useEffect(() => {
    setName(user?.name ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
    setBirthDate(user?.birthDate ?? '');
  }, [user]);

  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();
  const updateSettings = useUpdateSettings();

  const handleProfileSave = () => {
    updateProfile.mutate(
      { data: { name, birthDate: birthDate || null } } as any,
      {
        onSuccess: (data: any) => {
          setUser(data as User);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          showToast('Perfil atualizado!', 'success');
        },
        onError: () => showToast('Erro ao atualizar perfil.'),
      },
    );
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast('Permissão de galeria negada.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      showToast('Imagem muito grande. Máximo 2MB.');
      return;
    }
    setAvatarUploading(true);
    try {
      const cookie = getSessionCookieSync() ?? (await loadSession());
      const fd = new FormData();
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mime = asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      fd.append('avatar', { uri: asset.uri, name: `avatar.${ext}`, type: mime } as any);
      const resp = await fetch(getBaseUrl().replace(/\/+$/, '') + '/api/users/avatar', {
        method: 'POST',
        body: fd as any,
        headers: cookie ? { Cookie: cookie } : {},
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(err.error ?? 'Erro ao enviar foto.');
        return;
      }
      const data = await resp.json();
      setUser(data as User);
      setAvatarUrl(data.avatarUrl ?? '');
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      showToast('Foto atualizada!', 'success');
    } catch {
      showToast('Erro ao enviar foto.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSave = () => {
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    updatePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          showToast('Senha alterada!', 'success');
        },
        onError: (err: any) => showToast(err?.data?.error ?? 'Erro ao alterar senha.'),
      },
    );
  };

  const handleSettingsSave = () => {
    // Backend only knows builtin/googlemaps; collapse geocodebr→builtin on send.
    const sendInstance: 'builtin' | 'googlemaps' =
      instanceMode === 'googlemaps' ? 'googlemaps' : 'builtin';
    updateSettings.mutate(
      {
        data: {
          parserMode,
          aiProvider: aiProvider || null,
          aiApiKey: aiApiKey || null,
          toleranceMeters,
          instanceMode: sendInstance,
          googleMapsApiKey: googleMapsApiKey || null,
          valorPorRota: valorPorRota ? Number(valorPorRota) : null,
          cicloPagamentoDias,
          metaMensalRotas: metaMensalRotas ? Number(metaMensalRotas) : null,
          despesasFixasMensais: despesasFixasMensais ? Number(despesasFixasMensais) : null,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          showToast('Configurações salvas!', 'success');
        },
        onError: () => showToast('Erro ao salvar configurações.'),
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: c.text, letterSpacing: -0.4 }}>
          Configurações
        </Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginTop: 2 }}>
          Perfil, financeiro, instâncias, parser e tolerância.
        </Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4, paddingBottom: 8, marginBottom: 12 }}
        style={{ borderBottomWidth: 1, borderBottomColor: c.borderStrong, marginBottom: 12 }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? c.accent : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: isActive ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
                  color: isActive ? c.accent : c.textMuted,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'perfil' && (
        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
        >
          <Card style={{ marginBottom: 14 }}>
            <SectionHeader label="Foto e Informações" />
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: c.accentDim,
                    borderWidth: 2,
                    borderColor: c.borderStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.accent }}>
                      {(user?.name ?? 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                  {avatarUploading && (
                    <View
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text, marginBottom: 4 }}>
                    Foto de Perfil
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textFaint, marginBottom: 8 }}>
                    JPG, PNG, WEBP ou GIF · máx 2 MB
                  </Text>
                  <Pressable
                    onPress={handlePickAvatar}
                    disabled={avatarUploading}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      backgroundColor: c.surface2,
                      borderWidth: 1,
                      borderColor: c.borderStrong,
                      borderRadius: 99,
                      alignSelf: 'flex-start',
                      opacity: avatarUploading ? 0.6 : 1,
                    }}
                  >
                    <Ionicons name="image-outline" size={13} color={c.textMuted} />
                    <Text style={{ fontSize: 11.5, color: c.textMuted, fontFamily: 'Poppins_500Medium' }}>
                      {avatarUploading ? 'Enviando...' : 'Escolher da galeria'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 14, marginBottom: 16 }}>
                <Input label="Nome" value={name} onChangeText={setName} />
                <Input
                  label="Data de Nascimento"
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
                <View>
                  <Text
                    style={{
                      fontFamily: 'Poppins_600SemiBold',
                      fontSize: 10,
                      color: c.textFaint,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Email
                  </Text>
                  <View
                    style={{
                      backgroundColor: c.surface2,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: c.borderStrong,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      opacity: 0.6,
                    }}
                  >
                    <Text style={{ color: c.text, fontFamily: 'Poppins_400Regular', fontSize: 14 }}>
                      {user?.email ?? ''}
                    </Text>
                  </View>
                </View>
              </View>
              <Button
                label="Salvar Perfil"
                loading={updateProfile.isPending}
                onPress={handleProfileSave}
                fullWidth={false}
              />
            </View>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <SectionHeader label="Alterar Senha" />
            <View style={{ padding: 16, gap: 12 }}>
              <PasswordInput label="Senha Atual" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" />
              <PasswordInput label="Nova Senha" value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" />
              <PasswordInput label="Confirmar Nova Senha" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" />
              <View style={{ marginTop: 4 }}>
                <Button
                  label="Alterar Senha"
                  variant="dark"
                  loading={updatePassword.isPending}
                  onPress={handlePasswordSave}
                  fullWidth={false}
                />
              </View>
            </View>
          </Card>
        </MotiView>
      )}

      {tab === 'financeiro' && (
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <Card>
            <SectionHeader label="Controle de Renda" />
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18, marginBottom: 16 }}>
                Configure sua remuneração por rota e controle de despesas. Usado no gráfico financeiro do dashboard.
              </Text>
              <View style={{ gap: 14, marginBottom: 14 }}>
                <Input
                  label="Valor por Rota (R$)"
                  value={valorPorRota}
                  onChangeText={setValorPorRota}
                  placeholder="ex: 12.50"
                  keyboardType="decimal-pad"
                  hint="Quanto você recebe por rota processada"
                />
                <View>
                  <Text
                    style={{
                      fontFamily: 'Poppins_600SemiBold',
                      fontSize: 10,
                      color: c.textFaint,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Ciclo de Pagamento
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {CICLO_OPTS.map((o) => {
                      const isActive = cicloPagamentoDias === o.value;
                      return (
                        <Pressable
                          key={o.value}
                          onPress={() => setCicloPagamentoDias(o.value)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 99,
                            borderWidth: 1,
                            borderColor: isActive ? c.accent : c.borderStrong,
                            backgroundColor: isActive ? c.accentDim : c.surface2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11.5,
                              fontFamily: 'Poppins_500Medium',
                              color: isActive ? c.accent : c.textMuted,
                            }}
                          >
                            {o.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: c.surface2,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: 'Poppins_700Bold',
                    color: c.textMuted,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  Despesas e Metas
                </Text>
                <View style={{ gap: 12 }}>
                  <Input
                    label="Meta Mensal de Rotas"
                    value={metaMensalRotas}
                    onChangeText={setMetaMensalRotas}
                    placeholder="ex: 200"
                    keyboardType="number-pad"
                    hint="Quantas rotas quer processar/mês"
                  />
                  <Input
                    label="Despesas Fixas Mensais (R$)"
                    value={despesasFixasMensais}
                    onChangeText={setDespesasFixasMensais}
                    placeholder="ex: 450.00"
                    keyboardType="decimal-pad"
                    hint="Combustível, manutenção, seguro etc."
                  />
                </View>
              </View>

              {!!valorPorRota && !!cicloPagamentoDias && (
                <View
                  style={{
                    backgroundColor: c.accentDim,
                    borderColor: 'rgba(212,82,26,0.2)',
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontFamily: 'Poppins_600SemiBold', color: c.accent, marginBottom: 4 }}>
                    Prévia do seu potencial por ciclo
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 17 }}>
                    Com{' '}
                    <Text style={{ fontFamily: 'Poppins_700Bold' }}>
                      {Number(valorPorRota).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                    /rota e meta de <Text style={{ fontFamily: 'Poppins_700Bold' }}>{metaMensalRotas || '?'} rotas/mês</Text>, a
                    receita estimada é de{' '}
                    <Text style={{ fontFamily: 'Poppins_700Bold' }}>
                      {metaMensalRotas
                        ? ((Number(metaMensalRotas) * Number(valorPorRota) * cicloPagamentoDias) / 30).toLocaleString(
                            'pt-BR',
                            { style: 'currency', currency: 'BRL' },
                          )
                        : '?'}
                    </Text>{' '}
                    por ciclo.
                  </Text>
                </View>
              )}
              <Button
                label="Salvar Financeiro"
                loading={updateSettings.isPending}
                onPress={handleSettingsSave}
                fullWidth={false}
              />
            </View>
          </Card>
        </MotiView>
      )}

      {tab === 'instancias' && (
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <Card>
            <SectionHeader label="Instância de Geocodificação" />
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18, marginBottom: 14 }}>
                Escolha o serviço usado para validar endereços. A instância afeta precisão e custo de processamento.
              </Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {(
                  [
                    {
                      value: 'builtin',
                      label: 'Padrão Gratuito',
                      badge: 'Grátis',
                      badgeColor: c.ok,
                      badgeBg: c.okDim,
                      desc: 'Photon + Overpass + Nominatim (OSM) + BrasilAPI. Zero custo, sem chave.',
                      icon: 'globe-outline' as const,
                    },
                    {
                      value: 'geocodebr',
                      label: 'GeocodeR BR',
                      badge: 'Local / CNEFE',
                      badgeColor: '#7c3aed',
                      badgeBg: 'rgba(124,58,237,0.1)',
                      desc: 'Microserviço R via CNEFE/IBGE. Precisão máxima para BR.',
                      icon: 'home-outline' as const,
                    },
                    {
                      value: 'googlemaps',
                      label: 'Google Maps',
                      badge: 'Pay-per-use',
                      badgeColor: '#1565c0',
                      badgeBg: 'rgba(21,101,192,0.1)',
                      desc: 'Google Maps Geocoding API. Alta precisão global. Requer chave paga.',
                      icon: 'location-outline' as const,
                    },
                  ] as const
                ).map((opt) => {
                  const isActive = instanceMode === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setInstanceMode(opt.value);
                        setMapsKeyTouched(false);
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isActive ? c.accent : c.borderStrong,
                        backgroundColor: isActive ? c.accentDim : c.surface2,
                        flexDirection: 'row',
                        gap: 10,
                      }}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isActive ? c.accent : c.textMuted}
                        style={{ marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: 'Poppins_700Bold',
                              color: isActive ? c.accent : c.text,
                            }}
                          >
                            {opt.label}
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 99,
                              backgroundColor: opt.badgeBg,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9.5,
                                fontFamily: 'Poppins_700Bold',
                                color: opt.badgeColor,
                                letterSpacing: 0.5,
                              }}
                            >
                              {opt.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: c.textFaint, lineHeight: 16 }}>{opt.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {instanceMode === 'googlemaps' && (
                <View
                  style={{
                    backgroundColor: 'rgba(21,101,192,0.05)',
                    borderColor: 'rgba(21,101,192,0.2)',
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <PasswordInput
                    label="Chave de API do Google Maps"
                    value={googleMapsApiKey}
                    onChangeText={setGoogleMapsApiKey}
                    onBlur={() => setMapsKeyTouched(true)}
                    placeholder="AIzaSy..."
                    error={
                      mapsKeyTouched && googleMapsApiKey && !googleMapsApiKey.startsWith('AIza')
                        ? 'A chave deve começar com "AIza".'
                        : mapsKeyTouched &&
                            googleMapsApiKey &&
                            (googleMapsApiKey.length < 35 || googleMapsApiKey.length > 45)
                          ? 'Comprimento inválido.'
                          : null
                    }
                    hint="Habilite a Geocoding API no Google Cloud Console."
                  />
                </View>
              )}

              {instanceMode === 'geocodebr' && (
                <View
                  style={{
                    backgroundColor: 'rgba(124,58,237,0.05)',
                    borderColor: 'rgba(124,58,237,0.2)',
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#7c3aed', marginBottom: 8 }}>
                    Como ativar o GeocodeR BR
                  </Text>
                  <Text style={{ fontSize: 11.5, color: c.textFaint, lineHeight: 17 }}>
                    O microserviço precisa estar rodando localmente na porta <Text style={{ fontFamily: 'Poppins_700Bold' }}>8002</Text>.
                    Configure <Text style={{ fontFamily: 'Poppins_500Medium' }}>GEOCODEBR_URL=http://localhost:8002</Text> no servidor da
                    API.
                  </Text>
                </View>
              )}

              <Button
                label="Salvar Instância"
                loading={updateSettings.isPending}
                onPress={handleSettingsSave}
                fullWidth={false}
              />
            </View>
          </Card>
        </MotiView>
      )}

      {tab === 'parser' && (
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <Card>
            <SectionHeader label="Configuração do Parser" />
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 10,
                  color: c.textFaint,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Modo de Processamento
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                  { value: 'builtin', label: 'Parser Embutido', desc: 'Algoritmo próprio, offline, zero custo' },
                  { value: 'ai', label: 'Inteligência Artificial', desc: 'Maior precisão usando IA externa' },
                ].map((opt) => {
                  const isActive = parserMode === (opt.value as 'builtin' | 'ai');
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setParserMode(opt.value as 'builtin' | 'ai')}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isActive ? c.accent : c.borderStrong,
                        backgroundColor: isActive ? c.accentDim : c.surface2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Poppins_600SemiBold',
                          color: isActive ? c.accent : c.text,
                          marginBottom: 3,
                        }}
                      >
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: c.textFaint, lineHeight: 14 }}>{opt.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {parserMode === 'ai' && (
                <View
                  style={{
                    backgroundColor: c.surface2,
                    borderColor: c.borderStrong,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14,
                    gap: 12,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontFamily: 'Poppins_600SemiBold',
                        fontSize: 10,
                        color: c.textFaint,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      Provedor de IA
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { value: 'openai', label: 'OpenAI' },
                        { value: 'anthropic', label: 'Anthropic' },
                        { value: 'google', label: 'Google' },
                      ].map((p) => {
                        const isActive = aiProvider === p.value;
                        return (
                          <Pressable
                            key={p.value}
                            onPress={() => setAiProvider(p.value)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 99,
                              borderWidth: 1,
                              borderColor: isActive ? c.accent : c.borderStrong,
                              backgroundColor: isActive ? c.accentDim : c.surface,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11.5,
                                fontFamily: 'Poppins_500Medium',
                                color: isActive ? c.accent : c.textMuted,
                              }}
                            >
                              {p.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <PasswordInput
                    label="Chave de API"
                    value={aiApiKey}
                    onChangeText={setAiApiKey}
                    placeholder="sk-... ou AIza..."
                  />
                </View>
              )}
              <Button
                label="Salvar Parser"
                loading={updateSettings.isPending}
                onPress={handleSettingsSave}
                fullWidth={false}
              />
            </View>
          </Card>
        </MotiView>
      )}

      {tab === 'tolerancia' && (
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <Card>
            <SectionHeader label="Tolerância de Coordenadas" />
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18, marginBottom: 16 }}>
                Distância máxima (metros) entre a coordenada GPS do arquivo e o endereço oficial para ser considerado correto.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text
                  style={{
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 10,
                    color: c.textFaint,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  Distância de Tolerância
                </Text>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: c.accent }}>{toleranceMeters}m</Text>
              </View>
              <Slider
                minimumValue={100}
                maximumValue={5000}
                step={100}
                value={toleranceMeters}
                onValueChange={(v) => setToleranceMeters(Math.round(v))}
                minimumTrackTintColor={c.accent}
                maximumTrackTintColor={c.borderStrong}
                thumbTintColor={c.accent}
                style={{ width: '100%', height: 40 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
                <Text style={{ fontSize: 10, color: c.textFaint }}>100m · Rigoroso</Text>
                <Text style={{ fontSize: 10, color: c.textFaint }}>5000m · Flexível</Text>
              </View>
              <View
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: c.surface2,
                  borderColor: c.border,
                  borderWidth: 1,
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: c.textMuted, marginBottom: 4 }}>
                  {toleranceMeters <= 200
                    ? 'Rigoroso'
                    : toleranceMeters <= 800
                      ? 'Moderado'
                      : toleranceMeters <= 2000
                        ? 'Flexível'
                        : 'Muito Flexível'}
                </Text>
                <Text style={{ fontSize: 11, color: c.textFaint, lineHeight: 16 }}>
                  {toleranceMeters <= 200
                    ? 'Aceita apenas endereços muito próximos. Mais nuances detectadas.'
                    : toleranceMeters <= 800
                      ? 'Configuração balanceada para áreas urbanas.'
                      : toleranceMeters <= 2000
                        ? 'Aceita divergências maiores. Útil em áreas rurais.'
                        : 'Muito permissivo. Pode reduzir a qualidade.'}
                </Text>
              </View>
              <Button
                label="Salvar Tolerância"
                loading={updateSettings.isPending}
                onPress={handleSettingsSave}
                fullWidth={false}
              />
            </View>
          </Card>
        </MotiView>
      )}

      {tab === 'sobre' && (
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <Card style={{ marginBottom: 14 }}>
            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: c.text, letterSpacing: -0.5 }}>
                  ViaX<Text style={{ opacity: 0.4 }}>:</Text> System
                </Text>
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 5,
                    backgroundColor: c.accentDim,
                  }}
                >
                  <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: c.accent, letterSpacing: 0.5 }}>v8.0</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 10 }}>
                Validação inteligente de rotas de entrega
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
                Sistema de auditoria de rotas logísticas que valida endereços contra coordenadas GPS reais via geocodificação reversa.
                Detecta divergências e gera relatórios de nuances.
              </Text>
            </View>
          </Card>

          <Card>
            <SectionHeader label="Stack Tecnológico" />
            <View style={{ padding: 14, gap: 8 }}>
              {[
                { layer: 'Mobile', tech: 'React Native + Expo SDK 54' },
                { layer: 'Frontend Web', tech: 'React 18 + Vite' },
                { layer: 'Backend', tech: 'Express 5 + TypeScript' },
                { layer: 'Banco de Dados', tech: 'PostgreSQL + Drizzle ORM' },
                { layer: 'Geocod.', tech: 'Photon + Overpass + Nominatim + BrasilAPI' },
                { layer: 'Premium opt-in', tech: 'Google Maps API' },
              ].map((s) => (
                <View
                  key={s.layer}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: c.surface2,
                    borderColor: c.border,
                    borderWidth: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontFamily: 'Poppins_700Bold',
                      color: c.accent,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    {s.layer}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: c.text }}>{s.tech}</Text>
                </View>
              ))}
            </View>
          </Card>
        </MotiView>
      )}
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: 'Poppins_700Bold',
          letterSpacing: 1.1,
          color: c.textMuted,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

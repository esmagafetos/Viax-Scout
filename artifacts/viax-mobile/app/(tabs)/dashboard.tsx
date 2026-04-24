import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetDashboardSummary,
  useGetRecentAnalyses,
  useGetDashboardFinancial,
  type DashboardSummary,
  type DashboardFinancial,
  type AnalysisSummary,
  getGetDashboardSummaryQueryKey,
  getGetRecentAnalysesQueryKey,
  getGetDashboardFinancialQueryKey,
} from '@workspace/api-client-react';

import { Card } from '../../components/ui/Card';
import { Spinner, Skeleton } from '../../components/ui/Skeleton';
import { Pill } from '../../components/ui/Pill';
import Button from '../../components/ui/Button';
import ViaXLogo from '../../components/ViaXLogo';
import { useColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { formatBRL, formatDate, formatNumber } from '../../lib/format';

export default function DashboardScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const sumQ = useGetDashboardSummary<DashboardSummary>();
  const finQ = useGetDashboardFinancial<DashboardFinancial>();
  const recentQ = useGetRecentAnalyses<AnalysisSummary[]>();

  const s = sumQ.data;
  const f = finQ.data;
  const r = recentQ.data ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardFinancialQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetRecentAnalysesQueryKey() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  return (
    <ScrollView
      contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <HeroBanner userName={firstName} onAction={() => router.push('/(tabs)/process')} />

      {/* Page title */}
      <View style={{ marginBottom: 14, marginTop: 4 }}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, letterSpacing: -0.5, color: c.text }}>
          Dashboard
        </Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginTop: 2 }}>
          Resumo das suas análises e controle financeiro de rotas.
        </Text>
      </View>

      {/* Stats */}
      {sumQ.isLoading || !s ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={92} radius={14} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <StatTile value={String(s.totalAnalyses)} label="Análises" />
          <StatTile value={formatNumber(s.totalAddressesProcessed)} label="Endereços" good />
          <StatTile
            value={`${Math.round(((s.avgNuanceRate ?? 0) / Math.max(s.totalAddressesProcessed, 1)) * 100 || 0)}%`}
            label="Nuances"
            accent
          />
          <StatTile value={`${Math.round((s.avgSimilarity ?? 0) * 100)}%`} label="Similaridade" good />
          <StatTile value={String(s.analysesThisMonth)} label="Este Mês" />
        </View>
      )}

      {/* Financial */}
      {!finQ.isLoading && <FinancialPanel financial={f ?? null} onConfigure={() => router.push('/(tabs)/settings')} />}

      {/* Quick actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Button label="Nova Análise" iconLeft="add-circle-outline" onPress={() => router.push('/(tabs)/process')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Histórico" variant="ghost" onPress={() => router.push('/(tabs)/history')} />
        </View>
      </View>

      {/* Recent analyses */}
      <Card>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontFamily: 'Poppins_700Bold',
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: c.textMuted,
            }}
          >
            Análises Recentes
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/history')} accessibilityRole="link">
            <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: c.accent }}>Ver todas →</Text>
          </Pressable>
        </View>

        {recentQ.isLoading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Spinner />
          </View>
        ) : r.length === 0 ? (
          <Pressable onPress={() => router.push('/(tabs)/process')} style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: c.textFaint, fontFamily: 'Poppins_400Regular' }}>
              Nenhuma análise ainda.
            </Text>
            <Text style={{ fontSize: 12, color: c.accent, fontFamily: 'Poppins_600SemiBold', marginTop: 4 }}>
              Processar primeira rota →
            </Text>
          </Pressable>
        ) : (
          <View>
            {r.map((a, idx) => (
              <RecentRow key={a.id} item={a} last={idx === r.length - 1} />
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function StatTile({
  value,
  label,
  accent,
  good,
  sub,
}: {
  value: string;
  label: string;
  accent?: boolean;
  good?: boolean;
  sub?: string;
}) {
  const c = useColors();
  const accentColor = accent ? c.accent : good ? c.ok : c.text;
  const barColor = accent ? c.accent : good ? c.ok : c.border;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.borderStrong,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        paddingBottom: 12,
        flexBasis: '48%',
        flexGrow: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          fontFamily: 'Poppins_700Bold',
          fontSize: 24,
          letterSpacing: -0.5,
          color: accentColor,
          lineHeight: 26,
        }}
      >
        {value}
      </Text>
      {sub && (
        <Text style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>{sub}</Text>
      )}
      <Text
        style={{
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 9.5,
          letterSpacing: 0.5,
          color: c.textFaint,
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        {label}
      </Text>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: barColor }} />
    </View>
  );
}

function RecentRow({ item, last }: { item: AnalysisSummary; last: boolean }) {
  const c = useColors();
  const nuanceColor = item.nuances > 0 ? c.accent : c.ok;
  const nuanceBg = item.nuances > 0 ? c.accentDim : c.okDim;
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Poppins_500Medium', fontSize: 12, color: c.text }}>
          {item.fileName}
        </Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: c.textFaint, marginTop: 2 }}>
          {item.totalAddresses} endereços · {formatDate(item.createdAt)}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: nuanceBg,
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: 99,
        }}
      >
        <Text style={{ color: nuanceColor, fontFamily: 'Poppins_700Bold', fontSize: 11 }}>{item.nuances}</Text>
      </View>
      <Pill
        label={item.status === 'done' ? 'Concluído' : item.status}
        variant={item.status === 'done' ? 'ok' : 'accent'}
      />
    </View>
  );
}

function HeroBanner({ userName, onAction }: { userName: string; onAction: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <MotiView
      from={{ opacity: 0, translateY: -6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 360 }}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(212,82,26,0.2)',
      }}
    >
      <LinearGradient
        colors={['#1a0e08', '#2d1408', '#3d1c0c', '#1f0a18']}
        locations={[0, 0.4, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        {/* Decorative SVG path */}
        <Svg
          viewBox="0 0 600 120"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.06 }}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
        >
          <Path
            d="M0 60 C100 20 200 100 300 60 C400 20 500 80 600 40"
            stroke="white"
            strokeWidth={2}
            strokeDasharray="8 10"
            fill="none"
          />
          <Circle cx={0} cy={60} r={6} fill="white" />
          <Circle cx={300} cy={60} r={8} fill="white" fillOpacity={0.6} />
          <Circle cx={600} cy={40} r={5} fill="white" />
        </Svg>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#f0ede8' }}>
                Olá, {userName}!
              </Text>
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 99,
                  backgroundColor: 'rgba(212,82,26,0.25)',
                  borderWidth: 1,
                  borderColor: 'rgba(212,82,26,0.4)',
                }}
              >
                <Text style={{ color: '#e8a882', fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.6 }}>
                  v8.0
                </Text>
              </View>
            </View>
            <Text
              numberOfLines={2}
              style={{ fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(240,237,232,0.55)', lineHeight: 16 }}
            >
              Geocodificação multi-camada · Detecção de nuances avançada · Suporte a Travessa e Passagem
            </Text>
          </View>
          <Pressable onPress={() => setDismissed(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
            <Ionicons name="close" size={16} color="rgba(240,237,232,0.4)" />
          </Pressable>
        </View>

        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel="Nova Análise"
          style={({ pressed }) => ({
            backgroundColor: '#d4521a',
            paddingHorizontal: 18,
            paddingVertical: 11,
            borderRadius: 99,
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>Nova Análise</Text>
        </Pressable>
      </LinearGradient>
    </MotiView>
  );
}

function FinancialPanel({
  financial,
  onConfigure,
}: {
  financial: DashboardFinancial | null;
  onConfigure: () => void;
}) {
  const c = useColors();
  const f = financial;

  if (!f) return null;

  if (f.valorPorRota === null) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: c.text, marginBottom: 4 }}>
              Controle Financeiro
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: c.textFaint, lineHeight: 16 }}>
              Configure seu valor por rota e ciclo de pagamento para ver estimativas de receita.
            </Text>
          </View>
          <Button label="Configurar" size="sm" fullWidth={false} onPress={onConfigure} />
        </View>
      </Card>
    );
  }

  const cicloLabel = f.cicloPagamentoDias === 7 ? 'semanal' : f.cicloPagamentoDias === 14 ? 'quinzenal' : 'mensal';
  const metaPct = f.percentualMeta ?? 0;
  const hasMeta = f.metaRotas !== null && (f.metaRotas ?? 0) > 0;

  return (
    <Card style={{ marginBottom: 16 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontFamily: 'Poppins_700Bold',
            fontSize: 11,
            letterSpacing: 1.1,
            color: c.textMuted,
            textTransform: 'uppercase',
          }}
        >
          Ciclo {cicloLabel} · Financeiro
        </Text>
      </View>

      <View style={{ padding: 14 }}>
        {/* Numbers */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Receita', value: formatBRL(f.receitaEstimada), color: c.ok },
            { label: 'Despesas', value: formatBRL(f.despesasFixas), color: c.accent },
            { label: 'Lucro', value: formatBRL(f.lucroBruto), color: f.lucroBruto >= 0 ? c.ok : c.accent },
          ].map((n) => (
            <View
              key={n.label}
              style={{
                flexBasis: '31%',
                flexGrow: 1,
                backgroundColor: c.surface2,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: n.color, letterSpacing: -0.2 }}>
                {n.value}
              </Text>
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 9,
                  color: c.textFaint,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {n.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Routes + chart */}
        <View>
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: 9,
              color: c.textFaint,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Rotas no ciclo
          </Text>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 32, color: c.text, letterSpacing: -1, lineHeight: 34 }}>
            {f.rotasCicloAtual}
          </Text>
          {f.valorPorRota && (
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: c.textFaint, marginTop: 2 }}>
              × {formatBRL(f.valorPorRota)}/rota
            </Text>
          )}
          {hasMeta && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text
                  style={{
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 9,
                    color: c.textFaint,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  Meta
                </Text>
                <Text
                  style={{
                    fontFamily: 'Poppins_700Bold',
                    fontSize: 11,
                    color: metaPct >= 100 ? c.ok : c.accent,
                  }}
                >
                  {Math.round(metaPct)}%
                </Text>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: c.borderStrong, overflow: 'hidden' }}>
                <MotiView
                  from={{ width: '0%' as any }}
                  animate={{ width: `${Math.min(metaPct, 100)}%` as any }}
                  transition={{ type: 'timing', duration: 800 }}
                  style={{
                    height: '100%',
                    backgroundColor: metaPct >= 100 ? c.ok : c.accent,
                  }}
                />
              </View>
              <Text style={{ fontSize: 9, color: c.textFaint, marginTop: 3 }}>{f.metaRotas} rotas alvo</Text>
            </View>
          )}

          <MiniChart data={(f as any).graficoDiario ?? []} accent={c.accent} ok={c.ok} border={c.border} />
        </View>
      </View>
    </Card>
  );
}

function MiniChart({
  data,
  accent,
  ok,
  border,
}: {
  data: { data: string; rotas: number }[];
  accent: string;
  ok: string;
  border: string;
}) {
  if (!data?.length) return null;
  const maxRotas = Math.max(...data.map((d) => d.rotas), 1);
  const visible = data.slice(-20);
  const today = new Date().toISOString().substring(0, 10);
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 60 }}>
        {visible.map((d, i) => {
          const h = Math.max(2, Math.round((d.rotas / maxRotas) * 56));
          const isToday = d.data === today;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: isToday ? accent : d.rotas > 0 ? ok : border,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
                opacity: d.rotas > 0 ? 1 : 0.4,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// Avoid unused import warning when react-native-svg's Rect isn't used directly elsewhere
const _unused = Rect;

import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Card, H1, H2, Muted, Pill } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Stats = {
  totalAnalyses?: number;
  totalAddresses?: number;
  successRate?: number;
  lastAnalysisAt?: string | null;
};

export default function DashboardScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useQuery<Stats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => apiRequest<Stats>('/api/dashboard/stats'),
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />}
      >
        <View>
          <Muted>Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Muted>
          <H1>Painel</H1>
        </View>

        <View style={styles.grid}>
          <StatCard
            icon="documents-outline"
            label="Análises"
            value={isLoading ? '—' : String(data?.totalAnalyses ?? 0)}
          />
          <StatCard
            icon="location-outline"
            label="Endereços"
            value={isLoading ? '—' : String(data?.totalAddresses ?? 0)}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Sucesso"
            value={isLoading ? '—' : `${Math.round((data?.successRate ?? 0) * 100)}%`}
            tone="ok"
          />
          <StatCard
            icon="time-outline"
            label="Última"
            value={data?.lastAnalysisAt ? new Date(data.lastAnalysisAt).toLocaleDateString('pt-BR') : '—'}
          />
        </View>

        <Card>
          <H2>Bem-vindo ao ViaX:Trace</H2>
          <View style={{ height: 8 }} />
          <Muted>
            Valide planilhas XLSX/CSV de rotas de entrega contra coordenadas GPS. Use a aba Processar para enviar um arquivo.
          </Muted>
          <View style={{ height: 12 }} />
          <Pill tone="accent">Plano ativo</Pill>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'muted' | 'ok' | 'accent';
}) {
  const c = useColors();
  const color = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.text;
  return (
    <Card style={{ flex: 1, minWidth: '47%' }}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ height: 6 }} />
      <Muted>{label}</Muted>
      <View style={{ height: 2 }} />
      <H2>{value}</H2>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

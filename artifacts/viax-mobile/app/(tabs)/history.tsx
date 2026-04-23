import { ScrollView, View, StyleSheet, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Card, H1, Muted, Pill } from '@/components/ui';
import { apiRequest } from '@/lib/api';

type Analysis = {
  id: number;
  filename?: string;
  createdAt: string;
  totalAddresses?: number;
  successCount?: number;
};

export default function HistoryScreen() {
  const c = useColors();
  const { data, isLoading, refetch, isRefetching } = useQuery<Analysis[]>({
    queryKey: ['/api/analyses'],
    queryFn: () => apiRequest<Analysis[]>('/api/analyses'),
  });

  const items = data ?? [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />}
      >
        <H1>Histórico</H1>
        <Muted>{items.length} análise(s) realizada(s).</Muted>

        {isLoading && <Muted>Carregando...</Muted>}

        {!isLoading && items.length === 0 && (
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 32 }}>
            <Ionicons name="folder-open-outline" size={32} color={c.textMuted} />
            <Muted>Nenhuma análise ainda.</Muted>
          </Card>
        )}

        {items.map((a) => (
          <Card key={a.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                {a.filename ?? `Análise #${a.id}`}
              </Text>
              <Pill tone={a.successCount === a.totalAddresses ? 'ok' : 'muted'}>
                {a.successCount ?? 0}/{a.totalAddresses ?? 0}
              </Pill>
            </View>
            <Muted>
              {new Date(a.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </Muted>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, gap: 12 },
});

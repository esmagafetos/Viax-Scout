import { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  RefreshControl,
  Pressable,
  SectionList,
  type SectionListData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { H1, Muted, ConfirmModal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { formatDate, formatMs } from '@/lib/format';
import { useAnalysisHistory, type AnalysisItem } from '@/hooks/useAnalysisHistory';
import { RecentListLoading } from '@/components/states/LoadingState';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { buildCsv, shareCsv } from '@/lib/csv';

type ResultRow = {
  linha: number;
  endereco_original: string;
  nome_rua_extraido: string | null;
  nome_rua_oficial: string | null;
  similaridade: number | null;
  is_nuance: boolean;
  motivo: string;
  poi_estruturado: string | null;
  distancia_metros: number | null;
  tipo_endereco: string;
};

type Section = SectionListData<AnalysisItem, { title: string }>;

const PAGE_LIMIT = 10;

/** Bucket label for grouping; falls back to "Mês ano" for older items. */
function bucketLabel(iso: string): { key: string; label: string; order: number } {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = startOfDay(now);
  const day = startOfDay(d);
  const diffDays = Math.round((today - day) / 86_400_000);

  if (diffDays <= 0) return { key: 'today', label: 'Hoje', order: 0 };
  if (diffDays === 1) return { key: 'yesterday', label: 'Ontem', order: 1 };
  if (diffDays < 7) return { key: 'week', label: 'Esta semana', order: 2 };
  if (diffDays < 30) return { key: 'month', label: 'Este mês', order: 3 };

  const monthLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  // Older buckets ordered by reverse chronological year+month
  const ymOrder = 1_000_000 - (d.getFullYear() * 100 + (d.getMonth() + 1));
  return { key: `m-${d.getFullYear()}-${d.getMonth()}`, label: capitalize(monthLabel), order: 100 + ymOrder };
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function parseResultRows(raw: unknown): ResultRow[] {
  if (!raw) return [];
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? (v as ResultRow[]) : [];
  } catch {
    return [];
  }
}

export default function HistoryScreen() {
  const c = useColors();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalysisHistory({
    page,
    limit: PAGE_LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const sections: Section[] = useMemo(() => {
    const map = new Map<string, { label: string; order: number; data: AnalysisItem[] }>();
    for (const item of items) {
      const b = bucketLabel(item.createdAt);
      const entry = map.get(b.key);
      if (entry) {
        entry.data.push(item);
      } else {
        map.set(b.key, { label: b.label, order: b.order, data: [item] });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ title: s.label, data: s.data }));
  }, [items]);

  const requestDelete = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setConfirmId(id);
  };

  const performDelete = async () => {
    if (confirmId == null) return;
    const id = confirmId;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setDeletingId(id);
    try {
      await apiRequest(`/api/analyses/${id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      toast.showToast('Análise excluída.', 'success');
    } catch (e: any) {
      toast.showToast(e?.message ?? 'Falha ao excluir.');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const exportRow = async (a: AnalysisItem) => {
    setExportingId(a.id);
    try {
      let rows = parseResultRows(a.results);
      if (rows.length === 0) {
        // Lazy-fetch the full analysis if results aren't included in the listing.
        const full = await apiRequest<AnalysisItem>(`/api/analyses/${a.id}`);
        rows = parseResultRows(full.results);
      }
      if (rows.length === 0) {
        toast.showToast('Esta análise não possui detalhes para exportar.');
        return;
      }
      const header = [
        '#',
        'Endereço Original',
        'Rua Extraída',
        'Rua Oficial',
        'Similaridade',
        'Nuance',
        'Motivo',
        'POI',
      ];
      const dataRows = rows.map((r) => [
        r.linha,
        r.endereco_original,
        r.nome_rua_extraido ?? '',
        r.nome_rua_oficial ?? '',
        r.similaridade !== null ? (r.similaridade * 100).toFixed(1) + '%' : 'N/A',
        r.is_nuance ? 'Sim' : 'Não',
        r.motivo,
        r.poi_estruturado ?? '',
      ]);
      const csv = buildCsv(header, dataRows);
      const baseName = (a.fileName || `analise-${a.id}`).replace(/\.(xlsx|csv)$/i, '');
      await shareCsv(`viax-${baseName}.csv`, csv);
    } catch (e: any) {
      toast.showToast(e?.message ?? 'Falha ao exportar CSV.');
    } finally {
      setExportingId(null);
    }
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
      <Text style={[styles.sectionHeaderLabel, { color: c.textFaint }]}>{section.title}</Text>
      <View style={[styles.sectionHeaderRule, { backgroundColor: c.border }]} />
    </View>
  );

  const renderItem = ({ item, index }: { item: AnalysisItem; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 280, delay: Math.min(index, 6) * 40 }}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: c.surface,
            borderColor: c.borderStrong,
          },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text
            numberOfLines={1}
            style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}
          >
            {item.fileName}
          </Text>
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11 }}>
            #{item.id} · {formatDate(item.createdAt)} · {formatMs(item.processingTimeMs)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <Tag bg={c.surface2} fg={c.textFaint}>
              {item.totalAddresses} endereços
            </Tag>
            <Tag
              bg={item.nuances > 0 ? c.accentDim : 'rgba(46,168,99,0.15)'}
              fg={item.nuances > 0 ? c.accent : c.ok}
            >
              {item.nuances} nuances
            </Tag>
            {item.similarityAvg != null && (
              <Tag bg={c.surface2} fg={c.textFaint}>
                {(item.similarityAvg * 100).toFixed(1)}% sim.
              </Tag>
            )}
            {item.parserMode && (
              <Tag bg={c.surface2} fg={c.textFaint}>
                {item.parserMode}
              </Tag>
            )}
            <Tag
              bg={item.status === 'done' ? 'rgba(46,168,99,0.15)' : c.accentDim}
              fg={item.status === 'done' ? c.ok : c.accent}
            >
              {item.status === 'done' ? 'Concluído' : item.status}
            </Tag>
          </View>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={() => exportRow(item)}
            disabled={exportingId === item.id}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed || exportingId === item.id ? 0.5 : 1,
              padding: 6,
            })}
          >
            <Ionicons name="download-outline" size={18} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => requestDelete(item.id)}
            disabled={deletingId === item.id}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed || deletingId === item.id ? 0.5 : 1,
              padding: 6,
            })}
          >
            <Ionicons name="trash-outline" size={18} color={c.textFaint} />
          </Pressable>
        </View>
      </View>
    </MotiView>
  );

  const renderHeader = () => (
    <View style={{ marginBottom: 14 }}>
      <H1>Histórico de análises</H1>
      <Muted>
        {total > 0
          ? `${total} análise${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`
          : 'Nenhuma análise ainda.'}
      </Muted>
    </View>
  );

  const renderFooter = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={[styles.paginator, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 12 }}>
          Página {page} de {totalPages}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                borderColor: c.borderStrong,
                opacity: page <= 1 ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
              Anterior
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                borderColor: c.borderStrong,
                opacity: page >= totalPages ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
              Próxima
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Loading first page → skeleton (subsequent page changes keep previous data via placeholderData)
  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
        <AppHeader />
        <View style={{ padding: 16, gap: 14, flex: 1 }}>
          {renderHeader()}
          <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
              <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>Análises</Text>
            </View>
            <RecentListLoading rows={6} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !data) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
        <AppHeader />
        <View style={{ padding: 16, gap: 14, flex: 1 }}>
          {renderHeader()}
          <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <ErrorState error={error} onRetry={() => refetch()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
      <AppHeader />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <EmptyState
              icon="folder-open-outline"
              title="Nenhuma análise encontrada"
              subtitle="Processe uma rota para ver suas análises aqui."
            />
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.scrollContent,
          sections.length === 0 && { flexGrow: 1 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
      />
      <ConfirmModal
        visible={confirmId !== null}
        title="Excluir análise"
        message="Esta ação não pode ser desfeita. Os dados desta análise serão removidos permanentemente."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        loading={deletingId !== null}
        onConfirm={performDelete}
        onCancel={() => {
          if (deletingId === null) setConfirmId(null);
        }}
      />
    </SafeAreaView>
  );
}

function Tag({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 }}>
      <Text style={{ color: fg, fontFamily: 'Poppins_500Medium', fontSize: 10 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 4 },
  panel: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  panelHead: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  panelHeadLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionHeaderLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeaderRule: { flex: 1, height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  paginator: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    marginTop: 14,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
});

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Alert, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import {
  useListAnalyses,
  useDeleteAnalysis,
  getListAnalysesQueryKey,
  type AnalysesList,
  type Analysis,
} from '@workspace/api-client-react';

import { Card } from '../../components/ui/Card';
import { Pill } from '../../components/ui/Pill';
import { Spinner } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import { useColors } from '../../lib/theme';
import { useToast } from '../../components/Toast';
import { formatDate, formatMs } from '../../lib/format';

const LIMIT = 10;

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: onYes },
  ]);
}

export default function HistoryScreen() {
  const c = useColors();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useListAnalyses<AnalysesList>(
    { page, limit: LIMIT },
    { query: { queryKey: getListAnalysesQueryKey({ page, limit: LIMIT }) } },
  );

  const del = useDeleteAnalysis();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleDelete = (id: number) => {
    confirm('Excluir análise', 'Esta ação não pode ser desfeita.', () => {
      del.mutate(
        { id },
        {
          onSuccess: () => {
            showToast('Análise excluída.', 'success');
            queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
          },
          onError: () => showToast('Erro ao excluir.'),
        },
      );
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      {/* Header */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: -0.5, color: c.text }}>
          Histórico
        </Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginTop: 2 }}>
          {total > 0 ? `${total} análise${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}` : 'Nenhuma análise ainda.'}
        </Text>
      </View>

      <Card>
        {isLoading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Spinner />
          </View>
        ) : items.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Ionicons name="document-outline" size={32} color={c.textFaint} />
            <Text style={{ marginTop: 10, fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, textAlign: 'center' }}>
              Nenhuma análise encontrada.{'\n'}Processe uma rota para começar.
            </Text>
          </View>
        ) : (
          items.map((a, idx) => (
            <HistoryRow
              key={a.id}
              item={a}
              last={idx === items.length - 1}
              onDelete={() => handleDelete(a.id)}
            />
          ))
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: c.textFaint }}>
            Página {page} de {totalPages}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="Anterior"
              variant="ghost"
              size="sm"
              fullWidth={false}
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            />
            <Button
              label="Próxima"
              variant="ghost"
              size="sm"
              fullWidth={false}
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function HistoryRow({ item, last, onDelete }: { item: Analysis; last: boolean; onDelete: () => void }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const isDone = item.status === 'done';

  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`${item.fileName}, ${expanded ? 'recolher' : 'expandir'}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({
          padding: 14,
          backgroundColor: pressed ? c.surface2 : 'transparent',
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: 'Poppins_500Medium', fontSize: 13, color: c.text }}>
              {item.fileName}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: c.textFaint }}>
                #{item.id}
              </Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: c.textFaint }}>
                · {item.totalAddresses} endereços
              </Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: c.textFaint }}>
                · {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: item.nuances > 0 ? c.accentDim : c.okDim,
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 99,
            }}
          >
            <Text
              style={{
                color: item.nuances > 0 ? c.accent : c.ok,
                fontFamily: 'Poppins_700Bold',
                fontSize: 11,
              }}
            >
              {item.nuances}
            </Text>
          </View>
          <Pill label={isDone ? 'Concluído' : item.status} variant={isDone ? 'ok' : 'accent'} />
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </View>
      </Pressable>

      {expanded && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 180 }}
          style={{ paddingHorizontal: 14, paddingBottom: 14 }}
        >
          <View
            style={{
              backgroundColor: c.surface2,
              borderRadius: 10,
              padding: 12,
              gap: 8,
            }}
          >
            <DetailRow label="Geocodificados" value={String(item.geocodeSuccess ?? 0)} />
            <DetailRow label="Similaridade" value={`${(((item.similarityAvg ?? 0) as number) * 100).toFixed(1)}%`} />
            <DetailRow label="Tempo" value={formatMs(item.processingTimeMs as any)} />
            <DetailRow label="Parser" value={item.parserMode ?? '–'} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Button label="Excluir" variant="destructive" size="sm" iconLeft="trash-outline" onPress={onDelete} />
          </View>
        </MotiView>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: c.textFaint }}>{label}</Text>
      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: c.text }}>{value}</Text>
    </View>
  );
}

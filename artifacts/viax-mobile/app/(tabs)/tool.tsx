import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Card } from '../../components/ui/Card';
import { useColors } from '../../lib/theme';
import { useToast } from '../../components/Toast';
import { sseUpload, type SseFile } from '../../lib/sse-upload';
import { getBaseUrl, getSessionCookieSync, loadSession } from '../../lib/api';

interface CondoSummary {
  id: string;
  nome: string;
  status: 'ativo' | 'em_desenvolvimento';
  totalLotes?: number;
}

interface DeliveryRow {
  linha: number;
  enderecoOriginal: string;
  quadra: number | null;
  lote: number | null;
  classificacao: 'ordenada' | 'encontrada_sem_condominio' | 'nuance';
  motivo: string;
  ordem?: number;
  instrucao?: string;
}

interface RouteResult {
  condominio: { id: string; nome: string };
  totalLinhas: number;
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  detalhes: DeliveryRow[];
  metricas: { tempo_ms: number };
}

type Filter = 'all' | 'ordenada' | 'encontrada_sem_condominio' | 'nuance';

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Todos',
  ordenada: 'Ordenadas',
  encontrada_sem_condominio: 'Sem condomínio',
  nuance: 'Nuances',
};

const CLASS_LABEL: Record<DeliveryRow['classificacao'], string> = {
  ordenada: 'Ordenada',
  encontrada_sem_condominio: 'Sem condomínio',
  nuance: 'Nuance',
};

export default function ToolScreen() {
  const c = useColors();
  const { showToast } = useToast();

  const CLASS_COLOR: Record<DeliveryRow['classificacao'], string> = {
    ordenada: c.ok,
    encontrada_sem_condominio: '#7c3aed',
    nuance: c.accent,
  };

  const [condos, setCondos] = useState<CondoSummary[]>([]);
  const [selectedId, setSelectedId] = useState('bougainville-iii');
  const [file, setFile] = useState<SseFile | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  useEffect(() => {
    (async () => {
      try {
        const cookie = getSessionCookieSync() ?? (await loadSession());
        const r = await fetch(getBaseUrl().replace(/\/+$/, '') + '/api/condominium/list', {
          headers: cookie ? { Cookie: cookie } : {},
        });
        const d = await r.json();
        setCondos(d.condominios ?? []);
      } catch {
        setCondos([]);
      }
    })();
  }, []);

  const selected = condos.find((co) => co.id === selectedId);
  const canProcess = !!file && !isProcessing && selected?.status === 'ativo';

  const addStep = (msg: string) => setSteps((prev) => [...prev.slice(-20), msg]);

  const pickFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'],
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const ext = a.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'csv'].includes(ext ?? '')) {
        showToast('Formato inválido. Use .xlsx ou .csv');
        return;
      }
      setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
      setFileSize(a.size ?? null);
      setResult(null);
      setSteps([]);
    } catch (e: any) {
      showToast('Erro ao selecionar arquivo: ' + (e?.message ?? String(e)));
    }
  };

  const handleProcess = async () => {
    if (!file || !selected) return;
    if (selected.status !== 'ativo') {
      showToast('Este condomínio ainda está em desenvolvimento.');
      return;
    }
    setIsProcessing(true);
    setSteps([]);
    setResult(null);
    try {
      await sseUpload({
        path: '/api/condominium/process',
        fieldName: 'arquivo',
        file,
        extraFields: { condominioId: selected.id },
        onEvent: (event, data) => {
          if (event === 'step' && data?.step) addStep(data.step);
          else if (event === 'result' && data?.result) {
            setResult(data.result as RouteResult);
            addStep('✓ Sequência logística pronta!');
          } else if (event === 'error' && data?.error) showToast(String(data.error));
        },
        onError: (msg) => showToast(msg),
        onComplete: () => setIsProcessing(false),
      });
    } catch (e: any) {
      showToast('Erro de conexão: ' + (e?.message ?? String(e)));
      setIsProcessing(false);
    }
  };

  const filteredRows =
    result?.detalhes.filter((r) =>
      activeFilter === 'all' ? true : r.classificacao === activeFilter,
    ) ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: c.text, letterSpacing: -0.4 }}>
          Ferramenta de Condomínios
        </Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginTop: 2 }}>
          Rastreamento interno de entregas em condomínios fechados — Nova Califórnia (Tamoios).
        </Text>
      </View>

      {/* Selector */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1.2, color: c.textFaint, textTransform: 'uppercase' }}>
            Selecionar Condomínio
          </Text>
        </View>
        <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {condos.length === 0 ? (
            <Text style={{ padding: 12, fontSize: 12, color: c.textFaint }}>Carregando condomínios...</Text>
          ) : (
            condos.map((co) => {
              const isActive = co.id === selectedId;
              const isAvail = co.status === 'ativo';
              return (
                <Pressable
                  key={co.id}
                  onPress={() => isAvail && setSelectedId(co.id)}
                  disabled={!isAvail}
                  style={{
                    flexBasis: '48%',
                    flexGrow: 1,
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isActive ? c.accent : c.borderStrong,
                    backgroundColor: isActive ? c.accentDim : c.surface2,
                    opacity: isAvail ? 1 : 0.6,
                  }}
                >
                  <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: c.text }}>
                    {co.nome}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontFamily: 'Poppins_600SemiBold',
                      color: isAvail ? c.ok : c.textFaint,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      marginTop: 3,
                    }}
                  >
                    {isAvail ? `Disponível${co.totalLotes ? ` · ${co.totalLotes} lotes` : ''}` : 'Em desenvolvimento'}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </Card>

      {/* Upload card */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1.2, color: c.textFaint, textTransform: 'uppercase' }}>
            Importar Rota — {selected?.nome ?? '—'}
          </Text>
        </View>

        <Pressable
          onPress={pickFile}
          style={{
            margin: 10,
            paddingVertical: 26,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: file ? c.accent : 'transparent',
            borderRadius: 10,
            backgroundColor: file ? c.accentDim : 'transparent',
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: c.accentDim,
              borderWidth: 1,
              borderColor: c.borderStrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="cloud-upload-outline" size={22} color={c.accent} />
          </View>
          <Text numberOfLines={1} style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: c.text, textAlign: 'center', maxWidth: '90%' }}>
            {file ? file.name : 'Selecione a planilha'}
          </Text>
          <Text style={{ fontSize: 11, color: c.textFaint, textAlign: 'center' }}>
            {file && fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : 'XLSX ou CSV · máx 10MB'}
          </Text>
          <View
            style={{
              marginTop: 4,
              backgroundColor: c.accent,
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 99,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
              {file ? 'Trocar arquivo' : 'Selecionar arquivo'}
            </Text>
          </View>
        </Pressable>

        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Pressable
            onPress={handleProcess}
            disabled={!canProcess}
            style={{
              backgroundColor: c.text,
              paddingVertical: 12,
              borderRadius: 99,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: !canProcess ? 0.4 : 1,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={c.bg} />
            ) : (
              <Ionicons name="flash-outline" size={15} color={c.bg} />
            )}
            <Text style={{ color: c.bg, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
              {isProcessing ? 'Processando...' : 'Iniciar'}
            </Text>
          </Pressable>
        </View>

        {isProcessing && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 18, gap: 10 }}>
            {steps.map((step, i) => (
              <MotiView
                key={i}
                from={{ opacity: 0, translateX: -6 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 200 }}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 6 }} />
                <Text style={{ flex: 1, fontSize: 11.5, color: c.textFaint, lineHeight: 16 }}>{step}</Text>
              </MotiView>
            ))}
          </View>
        )}
      </Card>

      {result && (
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280 }}>
          {/* Stats */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {[
              { value: String(result.totalLinhas), label: 'Total', color: c.text, bar: c.border },
              { value: String(result.totalOrdenadas), label: 'Ordenadas', color: c.ok, bar: c.ok },
              { value: String(result.totalSemCondominio), label: 'Sem condomínio', color: '#7c3aed', bar: '#7c3aed' },
              { value: String(result.totalNuances), label: 'Nuances', color: c.accent, bar: c.accent },
            ].map((s) => (
              <View
                key={s.label}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  backgroundColor: c.surface,
                  borderColor: c.borderStrong,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 12,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 19, color: s.color, letterSpacing: -0.4 }}>{s.value}</Text>
                <Text
                  style={{
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 9.5,
                    color: c.textFaint,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </Text>
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: s.bar }} />
              </View>
            ))}
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4, marginBottom: 8 }}>
            {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => {
              const isActive = activeFilter === f;
              const count = f === 'all' ? result.detalhes.length : result.detalhes.filter((r) => r.classificacao === f).length;
              return (
                <Pressable
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 99,
                    backgroundColor: isActive ? c.accent : c.surface2,
                    borderWidth: 1,
                    borderColor: isActive ? c.accent : c.borderStrong,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: isActive ? '#fff' : c.textMuted,
                      fontFamily: 'Poppins_600SemiBold',
                    }}
                  >
                    {FILTER_LABEL[f]} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Sequence list */}
          <Card>
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1.2, color: c.textMuted, textTransform: 'uppercase' }}>
                Sequência de Entregas — {result.condominio.nome}
              </Text>
            </View>
            {filteredRows.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: c.textFaint, fontSize: 12 }}>Nenhum item para este filtro.</Text>
              </View>
            ) : (
              filteredRows.map((r, idx) => {
                const color = CLASS_COLOR[r.classificacao];
                return (
                  <View
                    key={`${r.linha}-${idx}`}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: c.border,
                      flexDirection: 'row',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: color + '22',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color, fontFamily: 'Poppins_700Bold', fontSize: 12 }}>{r.ordem ?? '—'}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: c.text }}>
                          {r.quadra !== null ? `Quadra ${r.quadra}` : 'Quadra ?'}
                          {r.lote !== null ? ` · Lote ${r.lote}` : ''}
                        </Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: color + '22' }}>
                          <Text style={{ fontSize: 9.5, color, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {CLASS_LABEL[r.classificacao]}
                          </Text>
                        </View>
                      </View>
                      {r.instrucao && (
                        <Text style={{ fontSize: 11.5, color: c.textMuted, marginBottom: 2 }}>➜ {r.instrucao}</Text>
                      )}
                      <Text style={{ fontSize: 10.5, color: c.textFaint }}>{r.enderecoOriginal}</Text>
                      <Text style={{ fontSize: 10, color: c.textFaint, fontStyle: 'italic', marginTop: 2 }}>{r.motivo}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </MotiView>
      )}
    </ScrollView>
  );
}

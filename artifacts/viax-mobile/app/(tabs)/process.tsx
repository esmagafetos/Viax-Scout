import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import Svg, { Circle } from 'react-native-svg';
import { useGetSettings, type UserSettings } from '@workspace/api-client-react';
import { Card } from '../../components/ui/Card';
import { useColors } from '../../lib/theme';
import { useToast } from '../../components/Toast';
import { formatMs, formatPct } from '../../lib/format';
import { sseUpload, type SseFile } from '../../lib/sse-upload';

interface ResultRow {
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
}

interface ProcessResult {
  total_enderecos: number;
  total_nuances: number;
  percentual_problema: number;
  detalhes: ResultRow[];
  metricas_tecnicas: {
    tempo_processamento_ms: number;
    taxa_geocode_sucesso: number;
    instancia: string;
  };
}

type Filter = 'all' | 'nuance' | 'ok';

export default function ProcessScreen() {
  const c = useColors();
  const { showToast } = useToast();
  const [file, setFile] = useState<SseFile | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const settingsQ = useGetSettings<UserSettings>();
  const settings: any = settingsQ.data;
  const instanceMode: string = settings?.instanceMode ?? 'builtin';
  const googleMapsApiKey: string = settings?.googleMapsApiKey ?? '';

  const configWarning = (() => {
    if (instanceMode === 'googlemaps' && !googleMapsApiKey)
      return {
        type: 'error' as const,
        message: 'Motor Google Maps selecionado, mas nenhuma chave de API foi configurada.',
        action: 'Adicione sua chave em Configurações → Instâncias para continuar.',
      };
    if (instanceMode === 'geocodebr')
      return {
        type: 'info' as const,
        message: 'Motor GeocodeR BR (CNEFE/IBGE) ativo.',
        action: 'Certifique-se de que o microserviço R está rodando localmente na porta 8002.',
      };
    return null;
  })();

  const canProcess = !!file && !isProcessing && !(configWarning?.type === 'error');

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
    if (!file) return;
    setIsProcessing(true);
    setSteps([]);
    setResult(null);
    try {
      await sseUpload({
        path: '/api/process/upload',
        fieldName: 'arquivo',
        file,
        onEvent: (event, data) => {
          if (event === 'step' && data?.step) addStep(data.step);
          else if (event === 'result' && data?.result) {
            setResult(data.result as ProcessResult);
            addStep('✓ Análise concluída!');
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
      activeFilter === 'all' ? true : activeFilter === 'nuance' ? r.is_nuance : !r.is_nuance,
    ) ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: c.text, letterSpacing: -0.4 }}>
          Processar Rota
        </Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: c.textFaint, marginTop: 2 }}>
          Importe um arquivo XLSX ou CSV com a coluna "Destination Address".
        </Text>
      </View>

      {configWarning && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
            backgroundColor:
              configWarning.type === 'error' ? 'rgba(212,82,26,0.08)' : 'rgba(124,58,237,0.07)',
            borderWidth: 1,
            borderColor:
              configWarning.type === 'error' ? 'rgba(212,82,26,0.3)' : 'rgba(124,58,237,0.25)',
          }}
        >
          <Ionicons
            name={configWarning.type === 'error' ? 'alert-circle' : 'information-circle'}
            size={18}
            color={configWarning.type === 'error' ? c.accent : '#7c3aed'}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Poppins_600SemiBold',
                color: configWarning.type === 'error' ? c.accent : '#7c3aed',
                marginBottom: 2,
              }}
            >
              {configWarning.message}
            </Text>
            <Text style={{ fontSize: 11, color: c.textFaint, lineHeight: 15 }}>
              {configWarning.action}
            </Text>
          </View>
        </View>
      )}

      {/* Upload card */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1.2, color: c.textFaint, textTransform: 'uppercase' }}>
            Importar Rota
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
            {file ? file.name : 'Selecione um arquivo'}
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
              shadowColor: c.accent,
              shadowOpacity: 0.3,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
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
              <Ionicons name="search" size={15} color={c.bg} />
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
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: c.accent,
                    marginTop: 6,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 11.5, color: c.textFaint, lineHeight: 16 }}>{step}</Text>
              </MotiView>
            ))}
          </View>
        )}
      </Card>

      {result && (
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280 }}>
          {/* Stats */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { value: String(result.total_enderecos), label: 'Total' },
              { value: String(result.total_nuances), label: 'Nuances', accent: true },
              { value: String(result.total_enderecos - result.total_nuances), label: 'OK', good: true },
              {
                value: `${result.percentual_problema}%`,
                label: 'Taxa Nuance',
                accent: result.percentual_problema > 20,
                good: result.percentual_problema <= 20,
              },
              {
                value: `${result.metricas_tecnicas.taxa_geocode_sucesso}%`,
                label: 'Geocode OK',
                good: true,
              },
              { value: formatMs(result.metricas_tecnicas.tempo_processamento_ms), label: 'Tempo' },
            ].map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </View>

          {/* Instance badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: c.textFaint }}>Processado via</Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 99,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.borderStrong,
              }}
            >
              <Text style={{ fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_700Bold' }}>
                {result.metricas_tecnicas.instancia}
              </Text>
            </View>
          </View>

          {/* Donut */}
          <DonutCard result={result} />

          {/* Filters + table */}
          <Card style={{ marginBottom: 12 }}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Detalhes
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['all', 'nuance', 'ok'] as Filter[]).map((f) => {
                  const isActive = activeFilter === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setActiveFilter(f)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: isActive ? c.accent : c.border,
                        backgroundColor: isActive ? c.accentDim : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: isActive ? c.accent : c.textMuted, fontFamily: 'Poppins_500Medium' }}>
                        {f === 'all' ? 'Todos' : f === 'nuance' ? 'Nuances' : 'OK'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {filteredRows.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: c.textFaint, fontSize: 12 }}>Nenhum registro para este filtro.</Text>
              </View>
            ) : (
              <View>
                {filteredRows.map((row) => (
                  <DetailRow key={row.linha} row={row} />
                ))}
              </View>
            )}
          </Card>
        </MotiView>
      )}
    </ScrollView>
  );
}

function StatTile({
  value,
  label,
  accent,
  good,
}: {
  value: string;
  label: string;
  accent?: boolean;
  good?: boolean;
}) {
  const c = useColors();
  const color = accent ? c.accent : good ? c.ok : c.text;
  const bar = accent ? c.accent : good ? c.ok : c.border;
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.borderStrong,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        flexBasis: '31%',
        flexGrow: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 19, color, letterSpacing: -0.4 }}>{value}</Text>
      <Text
        style={{
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 9,
          color: c.textFaint,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: bar }} />
    </View>
  );
}

function DonutCard({ result }: { result: ProcessResult }) {
  const c = useColors();
  const total = result.total_enderecos;
  const nuances = result.total_nuances;
  const ok = total - nuances;
  const pctNuance = total > 0 ? (nuances / total) * 100 : 0;
  const pctOk = 100 - pctNuance;

  const tipoMap: Record<string, { label: string; color: string }> = {
    rodovia: { label: 'Rodovias', color: '#f97316' },
    comercio: { label: 'Comércios', color: '#a855f7' },
    via_secundaria: { label: 'Via Secundária', color: '#3b82f6' },
    avenida_extensa: { label: 'Av. Extensas', color: '#eab308' },
    residencial: { label: 'Residencial', color: '#22c55e' },
  };
  const tipoCounts: Record<string, number> = {};
  for (const row of result.detalhes) {
    const t = row.tipo_endereco || 'residencial';
    tipoCounts[t] = (tipoCounts[t] || 0) + 1;
  }

  const R = 42;
  const cx = 56;
  const cy = 56;
  const stroke = 14;
  const circ = 2 * Math.PI * R;
  const nuanceDash = (pctNuance / 100) * circ;
  const okDash = (pctOk / 100) * circ;

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Análise Visual da Rota
        </Text>
      </View>
      <View style={{ padding: 14, gap: 18 }}>
        {/* Donut */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Svg width={112} height={112} viewBox="0 0 112 112">
            <Circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={c.ok}
              strokeWidth={stroke}
              strokeDasharray={`${okDash} ${circ}`}
              strokeDashoffset={0}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <Circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={c.accent}
              strokeWidth={stroke}
              strokeDasharray={`${nuanceDash} ${circ}`}
              strokeDashoffset={-okDash}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </Svg>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: c.text, marginTop: -52, marginBottom: 32 }}>
            {Math.round(pctNuance)}%
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.accent }} />
              <Text style={{ fontSize: 11, color: c.textMuted }}>Nuances ({nuances})</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.ok }} />
              <Text style={{ fontSize: 11, color: c.textMuted }}>OK ({ok})</Text>
            </View>
          </View>
        </View>

        {/* Bars */}
        <View>
          <Text
            style={{
              fontSize: 10,
              fontFamily: 'Poppins_600SemiBold',
              color: c.textFaint,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Distribuição por Tipo
          </Text>
          <View style={{ gap: 8 }}>
            {Object.entries(tipoMap).map(([tipo, { label, color }]) => {
              const count = tipoCounts[tipo] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <View key={tipo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_500Medium' }}>{label}</Text>
                    <Text style={{ fontSize: 11, color: c.textFaint }}>
                      {count} <Text style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</Text>
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 99, backgroundColor: c.borderStrong, overflow: 'hidden' }}>
                    <MotiView
                      from={{ width: '0%' as any }}
                      animate={{ width: `${pct}%` as any }}
                      transition={{ type: 'timing', duration: 700 }}
                      style={{ height: '100%', backgroundColor: color }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Card>
  );
}

function DetailRow({ row }: { row: ResultRow }) {
  const c = useColors();
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: c.textFaint }}>#{row.linha}</Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 99,
            backgroundColor: row.is_nuance ? c.accentDim : c.okDim,
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: row.is_nuance ? c.accent : c.ok }}>
            {row.is_nuance ? 'Nuance' : 'OK'}
          </Text>
        </View>
      </View>
      <Text numberOfLines={2} style={{ fontSize: 12, color: c.text, fontFamily: 'Poppins_500Medium' }}>
        {row.endereco_original}
      </Text>
      <Text style={{ fontSize: 10.5, color: c.textMuted }}>
        Extraída: {row.nome_rua_extraido ?? <Text style={{ fontStyle: 'italic', color: c.textFaint }}>não extraída</Text>}
      </Text>
      <Text style={{ fontSize: 10.5, color: c.textMuted }}>
        Oficial: {row.nome_rua_oficial ?? <Text style={{ fontStyle: 'italic', color: c.textFaint }}>não encontrada</Text>}
      </Text>
      {row.similaridade !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <View style={{ height: 4, width: 80, borderRadius: 2, backgroundColor: c.borderStrong, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${row.similaridade * 100}%`,
                backgroundColor: row.similaridade < 0.8 ? c.accent : c.ok,
              }}
            />
          </View>
          <Text style={{ fontSize: 10, color: c.textFaint }}>{formatPct(row.similaridade * 100)}</Text>
        </View>
      )}
      {row.motivo && (
        <Text numberOfLines={2} style={{ fontSize: 10, color: c.textFaint, fontStyle: 'italic', marginTop: 2 }}>
          {row.motivo}
        </Text>
      )}
    </View>
  );
}

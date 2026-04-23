import { useState } from 'react';
import { ScrollView, View, StyleSheet, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Button, Card, H1, H2, Muted, Pill } from '@/components/ui';
import { getApiUrl } from '@/lib/api';

type Progress = {
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  percent: number;
  message: string;
  total?: number;
  processed?: number;
};

export default function ProcessScreen() {
  const c = useColors();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [progress, setProgress] = useState<Progress>({ status: 'idle', percent: 0, message: '' });

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        '*/*',
      ],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      setFile(res.assets[0]);
      setProgress({ status: 'idle', percent: 0, message: '' });
    }
  };

  const upload = async () => {
    if (!file) return;
    setProgress({ status: 'uploading', percent: 0, message: 'Enviando arquivo...' });

    try {
      const form = new FormData();
      form.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as any);

      const res = await fetch(`${getApiUrl()}/api/process/upload`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Falha no envio (HTTP ${res.status})`);
      }

      setProgress({ status: 'processing', percent: 5, message: 'Processando endereços...' });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === 'progress') {
              setProgress({
                status: 'processing',
                percent: Math.round((evt.processed / Math.max(evt.total, 1)) * 100),
                message: `${evt.processed} de ${evt.total} endereços`,
                total: evt.total,
                processed: evt.processed,
              });
            } else if (evt.type === 'done') {
              setProgress({ status: 'done', percent: 100, message: 'Análise concluída' });
            } else if (evt.type === 'error') {
              setProgress({ status: 'error', percent: 0, message: evt.message ?? 'Erro' });
            }
          } catch {
            // ignore non-JSON
          }
        }
      }
    } catch (e: any) {
      setProgress({ status: 'error', percent: 0, message: e?.message ?? 'Erro inesperado' });
      Alert.alert('Erro', e?.message ?? 'Erro inesperado');
    }
  };

  const isWorking = progress.status === 'uploading' || progress.status === 'processing';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <H1>Processar rota</H1>
        <Muted>Envie uma planilha XLSX ou CSV (até 500 endereços, 10MB).</Muted>

        <Card style={{ gap: 12 }}>
          <H2>Arquivo</H2>
          {file ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: c.text, fontFamily: 'Poppins_500Medium', fontSize: 14 }} numberOfLines={1}>
                {file.name}
              </Text>
              <Muted>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}</Muted>
            </View>
          ) : (
            <View style={[styles.dropzone, { borderColor: c.border }]}>
              <Ionicons name="cloud-upload-outline" size={32} color={c.textMuted} />
              <Muted>Nenhum arquivo selecionado</Muted>
            </View>
          )}
          <Button onPress={pickFile} variant="ghost">
            {file ? 'Trocar arquivo' : 'Selecionar planilha'}
          </Button>
          <Button onPress={upload} disabled={!file || isWorking} loading={isWorking}>
            Iniciar análise
          </Button>
        </Card>

        {progress.status !== 'idle' && (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <H2>Progresso</H2>
              {progress.status === 'done' && <Pill tone="ok">Concluído</Pill>}
              {progress.status === 'error' && <Pill tone="accent">Erro</Pill>}
            </View>
            <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${progress.percent}%`, backgroundColor: progress.status === 'error' ? '#dc2626' : c.accent },
                ]}
              />
            </View>
            <Muted>{progress.message}</Muted>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, gap: 16 },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  bar: { height: 8, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
});

import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, Pill } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScreenHeader from "@/components/ScreenHeader";
import { streamSSE } from "@/lib/sse";
import { useToast } from "@/components/Toast";
import { formatBytes, formatPct, formatMs } from "@/lib/format";
import type { SSEResult, SSEResultRow } from "@/lib/types";

type Picked = { uri: string; name: string; size: number };
type Phase = "idle" | "ready" | "running" | "done" | "error";

export default function ProcessarScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<SSEResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cancelRef = useRef<{ cancel: () => void } | null>(null);

  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const ext = (a.name ?? "").toLowerCase().split(".").pop();
      if (ext !== "xlsx" && ext !== "csv") {
        show("Use um arquivo .xlsx ou .csv", "error");
        return;
      }
      if ((a.size ?? 0) > 10 * 1024 * 1024) {
        show("Arquivo acima de 10MB.", "error");
        return;
      }
      setFile({ uri: a.uri, name: a.name ?? "arquivo", size: a.size ?? 0 });
      setPhase("ready");
      setResult(null); setErrorMsg(null); setStep(""); setProgress(0);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      show(e?.message ?? "Falha ao selecionar arquivo.", "error");
    }
  };

  const start = () => {
    if (!file) return;
    setPhase("running"); setProgress(0); setStep("Enviando arquivo..."); setResult(null); setErrorMsg(null);
    cancelRef.current = streamSSE({
      path: "/process/upload",
      fileUri: file.uri,
      fileName: file.name,
      handlers: {
        onStep: (d) => { setStep(d.step); if (typeof d.progress === "number") setProgress(d.progress); },
        onResult: (d) => {
          setResult(d as SSEResult);
          setPhase("done");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          show("Análise concluída.", "success");
          void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          void queryClient.invalidateQueries({ queryKey: ["analyses"] });
        },
        onError: (d) => {
          setErrorMsg(d.error);
          setPhase("error");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
      onUploadProgress: (frac) => setProgress(frac * 0.3),
    });
  };

  const cancel = () => {
    cancelRef.current?.cancel();
    setPhase(file ? "ready" : "idle");
    setStep(""); setProgress(0);
  };

  const reset = () => {
    setFile(null); setPhase("idle"); setProgress(0); setStep(""); setResult(null); setErrorMsg(null);
  };

  const exportCsv = async () => {
    if (!result) return;
    const header = ["Linha", "Endereço", "Geocode", "Similaridade", "Nuance", "Distância (m)", "Motivo"].join(";");
    const rows = result.rows.map((r) =>
      [r.linha, csvEscape(r.endereco), r.geocodeOk ? "OK" : "Falha", ((r.similarity ?? 0) * 100).toFixed(1) + "%", r.nuance ? "Sim" : "Não", Math.round(r.distancia ?? 0), csvEscape(r.motivo ?? "")].join(";")
    );
    const csv = [header, ...rows].join("\n");
    const path = `${FileSystem.cacheDirectory}viax-resultado-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exportar resultado" });
    } else {
      show("Compartilhamento indisponível.", "error");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 18, paddingBottom: insets.bottom + 96 }}>
      <ScreenHeader title="Processar planilha" subtitle="Audite seus endereços de entrega — XLSX ou CSV (máx. 500 linhas, 10MB)" />

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Arquivo" subtitle='A coluna "Destination Address" é obrigatória.' />
        <Pressable onPress={pick} disabled={phase === "running"} style={({ pressed }) => ({
          borderColor: t.borderStrong, borderWidth: 1, borderStyle: "dashed", borderRadius: radii.lg,
          paddingVertical: 28, paddingHorizontal: 18, alignItems: "center", justifyContent: "center",
          backgroundColor: file ? t.surface2 : "transparent", opacity: pressed ? 0.7 : 1, gap: 8,
        })}>
          <Ionicons name={file ? "document-attach" : "cloud-upload-outline"} size={32} color={file ? t.accent : t.textFaint} />
          {file ? (
            <>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: t.text }} numberOfLines={1}>{file.name}</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{formatBytes(file.size)} · toque para trocar</Text>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: t.textMuted }}>Selecionar arquivo</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>XLSX ou CSV · máx. 10MB</Text>
            </>
          )}
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          {phase === "running" ? (
            <Button label="Cancelar" variant="outline" fullWidth onPress={cancel} />
          ) : (
            <Button label={phase === "done" ? "Nova análise" : "Iniciar auditoria"} variant="primary" fullWidth disabled={!file && phase !== "done"} onPress={phase === "done" ? reset : start} />
          )}
        </View>
      </Card>

      {phase === "running" && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Em andamento" />
            <View style={{ alignItems: "center", paddingVertical: 8, gap: 10 }}>
              <ActivityIndicator color={t.accent} />
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.text, textAlign: "center" }}>{step || "Processando..."}</Text>
              <ProgressBar value={progress} />
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{Math.round(progress * 100)}%</Text>
            </View>
          </Card>
        </Animated.View>
      )}

      {phase === "error" && errorMsg && (
        <Card style={{ marginBottom: 14, borderColor: t.accent, backgroundColor: t.accentDim }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Ionicons name="alert-circle" size={20} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.accent }}>Erro</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.text, marginTop: 4 }}>{errorMsg}</Text>
            </View>
          </View>
        </Card>
      )}

      {phase === "done" && result && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Resumo" right={<Pill label="Concluído" tone="ok" />} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
              <Stat title="Endereços" value={String(result.totalAddresses)} />
              <Stat title="Nuances" value={String(result.nuances)} accent={result.nuances > 0} />
              <Stat title="Geocode" value={String(result.geocodeSuccess)} />
              <Stat title="Similaridade" value={formatPct(result.similarityAvg)} />
              <Stat title="Tempo" value={formatMs(result.processingTimeMs)} />
            </View>
            <View style={{ height: 12 }} />
            <Button label="Exportar CSV" variant="secondary" leftIcon={<Ionicons name="download-outline" size={16} color={t.text} />} onPress={exportCsv} />
          </Card>

          <Card>
            <CardHeader title="Linhas" subtitle={`${result.rows.length} resultados`} />
            <View style={{ gap: 6 }}>
              {result.rows.slice(0, 30).map((r, i) => <RowCard key={i} row={r} />)}
              {result.rows.length > 30 && (
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 8 }}>
                  +{result.rows.length - 30} linhas no CSV exportado
                </Text>
              )}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function csvEscape(v: string): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[;"\n]/.test(s) ? `"${s}"` : s;
}

function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 6, backgroundColor: t.surface2, borderRadius: 999, width: "100%", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.max(2, Math.min(100, Math.round(value * 100)))}%`, backgroundColor: t.accent, borderRadius: 999 }} />
    </View>
  );
}

function Stat({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 10, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: accent ? t.accent : t.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function RowCard({ row }: { row: SSEResultRow }) {
  const t = useTheme();
  return (
    <View style={{ padding: 10, backgroundColor: t.surface2, borderRadius: radii.md, borderLeftWidth: 3, borderLeftColor: row.nuance ? t.accent : t.ok }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: t.textFaint }}>Linha {row.linha}</Text>
        <Pill label={row.nuance ? "Nuance" : "OK"} tone={row.nuance ? "accent" : "ok"} />
      </View>
      <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.text }} numberOfLines={2}>{row.endereco}</Text>
      {row.motivo && <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textMuted, marginTop: 4 }}>{row.motivo}</Text>}
    </View>
  );
}

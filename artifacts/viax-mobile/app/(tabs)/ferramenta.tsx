import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, Pill } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScreenHeader from "@/components/ScreenHeader";
import { streamSSE } from "@/lib/sse";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { formatBytes, formatMs } from "@/lib/format";
import type { Condominium, SSEResult } from "@/lib/types";

type Picked = { uri: string; name: string; size: number };
type Phase = "idle" | "ready" | "running" | "done" | "error";

export default function FerramentaScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const [condos, setCondos] = useState<Condominium[]>([]);
  const [loadingCondos, setLoadingCondos] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<SSEResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cancelRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ condominios: Condominium[] }>("/condominium/list");
        setCondos(r.condominios ?? []);
      } catch (e: any) {
        show(e?.message ?? "Falha ao carregar condomínios.", "error");
      } finally {
        setLoadingCondos(false);
      }
    })();
  }, [show]);

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
      if (ext !== "xlsx" && ext !== "csv") { show("Use .xlsx ou .csv.", "error"); return; }
      if ((a.size ?? 0) > 10 * 1024 * 1024) { show("Acima de 10MB.", "error"); return; }
      setFile({ uri: a.uri, name: a.name ?? "arquivo", size: a.size ?? 0 });
      setResult(null); setErrorMsg(null); setStep(""); setProgress(0);
      setPhase(selected ? "ready" : "idle");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      show(e?.message ?? "Falha ao selecionar arquivo.", "error");
    }
  };

  const choose = (id: string) => {
    setSelected(id);
    setPhase(file ? "ready" : "idle");
    void Haptics.selectionAsync();
  };

  const start = () => {
    if (!file || !selected) return;
    setPhase("running"); setProgress(0); setStep("Enviando arquivo..."); setResult(null); setErrorMsg(null);
    cancelRef.current = streamSSE({
      path: "/condominium/process",
      fileUri: file.uri,
      fileName: file.name,
      fields: { condominioId: selected },
      handlers: {
        onStep: (d) => { setStep(d.step); if (typeof d.progress === "number") setProgress(d.progress); },
        onResult: (d) => {
          setResult(d as SSEResult);
          setPhase("done");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          show("Rota gerada!", "success");
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

  const cancel = () => { cancelRef.current?.cancel(); setPhase(file && selected ? "ready" : "idle"); };
  const reset = () => { setFile(null); setResult(null); setErrorMsg(null); setPhase(selected ? "idle" : "idle"); setStep(""); setProgress(0); };

  const exportCsv = async () => {
    if (!result) return;
    const header = ["Linha", "Endereço", "Resultado"].join(";");
    const rows = result.rows.map((r) => [r.linha, csvEscape(r.endereco), csvEscape(r.motivo ?? "")].join(";"));
    const csv = [header, ...rows].join("\n");
    const path = `${FileSystem.cacheDirectory}viax-rota-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exportar rota" });
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 18, paddingBottom: insets.bottom + 96 }}>
      <ScreenHeader title="Ferramenta de rotas" subtitle="Otimize entregas em condomínios suportados" />

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Condomínio" subtitle="Selecione o destino" />
        {loadingCondos ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}><ActivityIndicator color={t.accent} /></View>
        ) : condos.length === 0 ? (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, textAlign: "center", paddingVertical: 12 }}>
            Nenhum condomínio disponível.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {condos.map((c) => {
              const isSel = selected === c.id;
              const dev = c.status !== "ativo";
              return (
                <Pressable
                  key={c.id}
                  disabled={dev}
                  onPress={() => choose(c.id)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: isSel ? t.accent : t.borderStrong,
                    backgroundColor: isSel ? t.accentDim : t.surface2,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    opacity: dev ? 0.55 : pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: isSel ? t.accent : t.surface, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="business" size={18} color={isSel ? "#fff" : t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text }}>{c.nome}</Text>
                    <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 1 }}>
                      {c.cidade}{c.totalUnidades ? ` · ${c.totalUnidades} unidades` : ""}
                    </Text>
                  </View>
                  <Pill label={dev ? "Em breve" : "Ativo"} tone={dev ? "neutral" : "ok"} />
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Planilha" subtitle='Coluna "Destination Address" obrigatória' />
        <Pressable onPress={pick} disabled={phase === "running"} style={({ pressed }) => ({
          borderColor: t.borderStrong, borderWidth: 1, borderStyle: "dashed", borderRadius: radii.lg,
          paddingVertical: 24, paddingHorizontal: 18, alignItems: "center", justifyContent: "center",
          backgroundColor: file ? t.surface2 : "transparent", opacity: pressed ? 0.7 : 1, gap: 8,
        })}>
          <Ionicons name={file ? "document-attach" : "document-outline"} size={28} color={file ? t.accent : t.textFaint} />
          {file ? (
            <>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text }} numberOfLines={1}>{file.name}</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{formatBytes(file.size)}</Text>
            </>
          ) : (
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.textMuted }}>Selecionar arquivo</Text>
          )}
        </Pressable>

        <View style={{ marginTop: 14 }}>
          {phase === "running" ? (
            <Button label="Cancelar" variant="outline" fullWidth onPress={cancel} />
          ) : (
            <Button label={phase === "done" ? "Nova rota" : "Gerar rota"} variant="primary" fullWidth disabled={(!file || !selected) && phase !== "done"} onPress={phase === "done" ? reset : start} />
          )}
        </View>
      </Card>

      {phase === "running" && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Card style={{ marginBottom: 14 }}>
            <View style={{ alignItems: "center", paddingVertical: 8, gap: 10 }}>
              <ActivityIndicator color={t.accent} />
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.text, textAlign: "center" }}>{step || "Processando..."}</Text>
              <View style={{ height: 6, backgroundColor: t.surface2, borderRadius: 999, width: "100%", overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.max(2, Math.min(100, Math.round(progress * 100)))}%`, backgroundColor: t.accent }} />
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {phase === "error" && errorMsg && (
        <Card style={{ marginBottom: 14, borderColor: t.accent, backgroundColor: t.accentDim }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Ionicons name="alert-circle" size={20} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.accent }}>Erro</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.text, marginTop: 4 }}>{errorMsg}</Text>
            </View>
          </View>
        </Card>
      )}

      {phase === "done" && result && (
        <Card>
          <CardHeader title="Rota gerada" right={<Pill label="Concluído" tone="ok" />} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 12 }}>
            <Stat title="Endereços" value={String(result.totalAddresses)} />
            <Stat title="Tempo" value={formatMs(result.processingTimeMs)} />
          </View>
          <Button label="Exportar CSV" variant="secondary" leftIcon={<Ionicons name="download-outline" size={16} color={t.text} />} onPress={exportCsv} />
        </Card>
      )}
    </ScrollView>
  );
}

function csvEscape(v: string): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[;"\n]/.test(s) ? `"${s}"` : s;
}

function Stat({ title, value }: { title: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 10, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: t.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

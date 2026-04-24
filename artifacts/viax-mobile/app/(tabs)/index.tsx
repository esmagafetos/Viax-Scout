import React, { useCallback } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, StatTile, Pill } from "@/components/ui/Card";
import ScreenHeader from "@/components/ScreenHeader";
import { Donut, BarChart } from "@/components/Sparkline";
import { formatPct, formatDateTime } from "@/lib/format";
import type { DashboardSummary, FinancialSummary, RecentAnalysis } from "@/lib/types";

export default function DashboardScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: () => api<DashboardSummary>("/dashboard/summary") });
  const recent = useQuery({ queryKey: ["dashboard", "recent"], queryFn: () => api<RecentAnalysis[]>("/dashboard/recent") });
  const financial = useQuery({ queryKey: ["dashboard", "financial"], queryFn: () => api<FinancialSummary>("/dashboard/financial") });

  useFocusEffect(useCallback(() => {
    void summary.refetch(); void recent.refetch(); void financial.refetch();
  }, [summary, recent, financial]));

  const refreshing = summary.isFetching || recent.isFetching || financial.isFetching;
  const onRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const s = summary.data;
  const f = financial.data;
  const recentItems = recent.data ?? [];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const chartW = width - 44 - 32;
  const recentBars = recentItems.length > 0 ? recentItems.map((r) => r.totalAddresses).reverse() : [4, 8, 6, 12, 9, 14, 11];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 18, paddingBottom: insets.bottom + 96 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
    >
      <ScreenHeader
        title={`${greeting},`}
        subtitle={user?.name ? `${user.name.split(" ")[0]} — visão geral das suas auditorias` : "Visão geral das suas auditorias"}
      />

      {summary.isLoading ? (
        <View style={{ paddingVertical: 60, alignItems: "center" }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <StatTile label="Análises" value={String(s?.totalAnalyses ?? 0)} hint={`${s?.analysesThisMonth ?? 0} este mês`} accent />
            <StatTile label="Endereços" value={String(s?.totalAddressesProcessed ?? 0)} hint="processados" />
            <StatTile label="Geocode médio" value={formatPct(s?.avgGeocodeSuccess ?? 0)} hint="taxa de sucesso" />
            <StatTile label="Similaridade" value={formatPct(s?.avgSimilarity ?? 0)} hint="média geral" />
          </View>

          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Qualidade da auditoria" subtitle="Indicadores médios" />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 6 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ position: "relative" }}>
                  <Donut value={(s?.avgGeocodeSuccess ?? 0) > 1.5 ? (s?.avgGeocodeSuccess ?? 0) / 100 : (s?.avgGeocodeSuccess ?? 0)} color={t.ok} size={92} />
                  <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: t.text }}>{formatPct(s?.avgGeocodeSuccess ?? 0, 0)}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: t.textMuted, marginTop: 6 }}>Geocode</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ position: "relative" }}>
                  <Donut value={(s?.avgSimilarity ?? 0) > 1.5 ? (s?.avgSimilarity ?? 0) / 100 : (s?.avgSimilarity ?? 0)} size={92} />
                  <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: t.text }}>{formatPct(s?.avgSimilarity ?? 0, 0)}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: t.textMuted, marginTop: 6 }}>Similaridade</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ position: "relative" }}>
                  <Donut value={Math.min(1, (s?.avgNuanceRate ?? 0) / Math.max(1, s?.totalAddressesProcessed ?? 1))} color={t.accent} size={92} />
                  <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 14, color: t.text }}>{Math.round(s?.avgNuanceRate ?? 0)}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: t.textMuted, marginTop: 6 }}>Nuances</Text>
              </View>
            </View>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Volume recente" subtitle="Últimas análises por endereços" />
            <BarChart values={recentBars} width={chartW} height={120} />
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Atividade recente" right={
              <Text onPress={() => router.push("/(tabs)/historico")} style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.accent }}>
                Ver tudo
              </Text>
            } />
            {recentItems.length === 0 ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <Ionicons name="document-text-outline" size={28} color={t.textFaint} />
                <Text style={{ fontFamily: "Poppins_400Regular", color: t.textFaint, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                  Nenhuma análise ainda. Processe uma rota para começar.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {recentItems.slice(0, 5).map((r) => (
                  <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
                    <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: t.accentDim, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="document-text-outline" size={16} color={t.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.text }}>{r.fileName}</Text>
                      <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 1 }}>
                        {r.totalAddresses} endereços · {formatDateTime(r.createdAt)}
                      </Text>
                    </View>
                    <Pill label={`${r.nuances} nuances`} tone={r.nuances > 0 ? "accent" : "ok"} />
                  </View>
                ))}
              </View>
            )}
          </Card>

          {f && (
            <Card>
              <CardHeader title="Configuração ativa" subtitle="Modo do parser e tolerância" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pill label={`Parser: ${f.parserMode === "google" ? "Google" : "Built-in"}`} tone={f.parserMode === "google" ? "accent" : "neutral"} />
                <Pill label={`Tolerância: ${f.toleranceMeters}m`} tone="neutral" />
                <Pill label={`Geocode calls: ${f.geocodeCalls ?? 0}`} tone="neutral" />
              </View>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

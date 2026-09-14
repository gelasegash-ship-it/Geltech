import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniChart } from "@/components/MiniChart";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { useLivePrices } from "@/hooks/useLivePrices";
import { useMarketData } from "@/hooks/useMarketData";

const BASE_URL = process.env["EXPO_PUBLIC_DOMAIN"]
  ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`
  : "";

interface AIInsight {
  type: "success" | "warning" | "info" | "danger";
  title: string;
  message: string;
}

const TYPE_COLORS = { success: "#22C55E", warning: "#F59E0B", info: "#D4AF37", danger: "#EF4444" };
const TYPE_ICONS = { success: "trending-up", warning: "alert-triangle", info: "cpu", danger: "alert-circle" };

function generateNetWorthHistory(base: number): number[] {
  const pts = 30;
  const result: number[] = [];
  let val = base * 0.82;
  for (let i = 0; i < pts; i++) {
    val += Math.random() * 220 - 40 + 10;
    result.push(Math.max(val, base * 0.5));
  }
  result[pts - 1] = base;
  return result;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { netWorth, totalGains, monthlySavings, monthlyExpenses, data, totalInvested } = useAppData();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [netWorthHistory] = useState(() => generateNetWorthHistory(netWorth));
  const abortRef = useRef<AbortController | null>(null);
  const dataRef = useRef(data);
  const metricsRef = useRef({ monthlyExpenses, monthlySavings });
  dataRef.current = data;
  metricsRef.current = { monthlyExpenses, monthlySavings };

  const symbols = data.investments.map((i) => i.symbol);
  const { prices: livePrices, lastUpdated, refresh: refreshPrices } = useLivePrices(symbols, 30000);
  const { coins, loading: coinsLoading, refresh: refreshCoins } = useMarketData(10, 60000);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
    fetchInsights();
    return () => { abortRef.current?.abort(); };
  }, []);

  const fetchInsights = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingInsights(true);
    const { monthlyExpenses: expenses, monthlySavings: savings } = metricsRef.current;
    const d = dataRef.current;
    try {
      const res = await fetch(`${BASE_URL}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          portfolio: d.investments.map((i) => ({
            symbol: i.symbol,
            value: i.currentPrice * i.quantity,
            gainPercent: (((i.currentPrice) - i.buyPrice) / i.buyPrice) * 100,
          })),
          budget: { income: d.monthlyIncome, expenses, savings },
        }),
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const json = await res.json() as { insights: AIInsight[] };
        setInsights(json.insights || []);
      } else {
        setInsights([{ type: "info", title: "Analyse IA", message: "Appuyez sur actualiser pour une analyse de votre portefeuille." }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setInsights([{ type: "info", title: "Analyse IA", message: "Actualisez pour obtenir vos insights personnalisés." }]);
    } finally {
      if (!controller.signal.aborted) setLoadingInsights(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([fetchInsights(), refreshPrices(), refreshCoins()]);
    setRefreshing(false);
  }, [fetchInsights, refreshPrices, refreshCoins]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const gainPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  const liveNetWorth = data.investments.reduce((sum, inv) =>
    sum + (livePrices[inv.symbol] ?? inv.currentPrice) * inv.quantity, 0
  ) + data.savingsGoals.reduce((s, g) => s + g.current, 0)
    + data.bankAccounts.reduce((s, a) => s + a.balance, 0);
  const displayNetWorth = Object.keys(livePrices).length > 0 ? liveNetWorth : netWorth;
  const savingsRate = data.monthlyIncome > 0 ? (monthlySavings / data.monthlyIncome) * 100 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <LinearGradient colors={["#1A2340", "#0D1526", "#0A0F1E"]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Bonjour</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tableau de bord</Text>
          </View>
          <View style={styles.headerActions}>
            {lastUpdated && (
              <View style={[styles.liveBadge, { backgroundColor: "#22C55E22" }]}>
                <Animated.View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.liveText, { color: "#22C55E" }]}>LIVE</Text>
              </View>
            )}
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchInsights(); }}
            >
              <Feather name="refresh-cw" size={17} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Net worth card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={["#D4AF37", "#C9A020", "#B8941E"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.netWorthCard}
          >
            <Text style={styles.netWorthLabel}>Patrimoine Net</Text>
            <Text style={styles.netWorthValue} numberOfLines={1} adjustsFontSizeToFit>
              {displayNetWorth.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </Text>
            <View style={styles.netWorthGainRow}>
              <Feather name={totalGains >= 0 ? "trending-up" : "trending-down"} size={15} color="#0A0F1E" />
              <Text style={styles.netWorthGain}>
                {totalGains >= 0 ? "+" : ""}
                {totalGains.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                {"  "}({gainPercent >= 0 ? "+" : ""}{gainPercent.toFixed(1)}%)
              </Text>
            </View>
            <View style={styles.chartWrap}>
              <MiniChart data={netWorthHistory} width={340} height={58} color="#0A0F1E" showGradient />
            </View>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: "Revenus", value: data.monthlyIncome, color: colors.success, icon: "arrow-up" },
          { label: "Dépenses", value: monthlyExpenses, color: colors.destructive, icon: "arrow-down" },
          { label: "Épargne", value: monthlySavings, color: colors.primary, icon: "save" },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: s.color + "22" }]}>
              <Feather name={s.icon as "save"} size={14} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {s.value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Savings rate */}
      <View style={[styles.savingsBar, { backgroundColor: colors.card, marginHorizontal: 20 }]}>
        <View style={styles.savingsBarTop}>
          <Text style={[styles.savingsBarLabel, { color: colors.mutedForeground }]}>Taux d'épargne</Text>
          <Text style={[styles.savingsBarPct, { color: colors.primary }]}>{savingsRate.toFixed(0)}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${Math.min(Math.max(savingsRate, 0), 100)}%` as `${number}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      {/* Live Markets */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Marchés Live</Text>
          <View style={[styles.liveBadgeSmall, { backgroundColor: colors.success + "22" }]}>
            <Text style={[styles.liveBadgeSmallText, { color: colors.success }]}>
              {coinsLoading ? "Sync..." : "Temps réel"}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coinsScroll}>
          {coins.length === 0
            ? [1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.coinCard, { backgroundColor: colors.card, opacity: 0.5 }]}>
                  <View style={[styles.coinIconPlaceholder, { backgroundColor: colors.muted }]} />
                  <View style={[styles.coinNamePlaceholder, { backgroundColor: colors.muted }]} />
                </View>
              ))
            : coins.slice(0, 8).map((coin) => {
                const isUp = coin.price_change_percentage_24h >= 0;
                return (
                  <View key={coin.id} style={[styles.coinCard, { backgroundColor: colors.card }]}>
                    <View style={styles.coinHeader}>
                      <View style={[styles.coinRank, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.coinRankText, { color: colors.mutedForeground }]}>#{coin.market_cap_rank}</Text>
                      </View>
                    </View>
                    <Text style={[styles.coinSymbol, { color: colors.foreground }]}>{coin.symbol.toUpperCase()}</Text>
                    <Text style={[styles.coinPrice, { color: colors.foreground }]}>
                      ${coin.current_price < 1
                        ? coin.current_price.toFixed(4)
                        : coin.current_price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </Text>
                    <View style={[styles.coinChangeBadge, { backgroundColor: isUp ? "#22C55E22" : "#EF444422" }]}>
                      <Feather name={isUp ? "trending-up" : "trending-down"} size={10} color={isUp ? "#22C55E" : "#EF4444"} />
                      <Text style={[styles.coinChange, { color: isUp ? "#22C55E" : "#EF4444" }]}>
                        {isUp ? "+" : ""}{coin.price_change_percentage_24h.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
        </ScrollView>
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Insights IA</Text>
          <Feather name="cpu" size={16} color={colors.primary} />
        </View>
        {loadingInsights ? (
          <View style={[styles.placeholderCard, { backgroundColor: colors.card }]}>
            <Feather name="loader" size={18} color={colors.mutedForeground} />
            <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>Analyse en cours...</Text>
          </View>
        ) : insights.length > 0 ? (
          insights.map((ins, i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: colors.card, borderLeftColor: TYPE_COLORS[ins.type] }]}>
              <View style={styles.insightHeader}>
                <Feather name={TYPE_ICONS[ins.type] as "cpu"} size={13} color={TYPE_COLORS[ins.type]} />
                <Text style={[styles.insightTitle, { color: colors.foreground }]}>{ins.title}</Text>
              </View>
              <Text style={[styles.insightMsg, { color: colors.mutedForeground }]}>{ins.message}</Text>
            </View>
          ))
        ) : (
          <View style={[styles.placeholderCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>Tirez vers le bas pour actualiser</Text>
          </View>
        )}
      </View>

      {/* Portfolio preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes Investissements</Text>
        {data.investments.map((inv) => {
          const livePrice = livePrices[inv.symbol];
          const price = livePrice ?? inv.currentPrice;
          const gain = ((price - inv.buyPrice) / inv.buyPrice) * 100;
          const isUp = gain >= 0;
          return (
            <View key={inv.id} style={[styles.invRow, { backgroundColor: colors.card }]}>
              <View style={[styles.invBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.invBadgeText, { color: colors.primary }]}>{inv.symbol.slice(0, 3)}</Text>
              </View>
              <View style={styles.invMid}>
                <Text style={[styles.invName, { color: colors.foreground }]}>{inv.name}</Text>
                <Text style={[styles.invSub, { color: colors.mutedForeground }]}>
                  {inv.quantity}x · ${price.toFixed(price < 1 ? 4 : 2)}
                  {livePrice ? <Text style={{ color: colors.success }}>  ●</Text> : null}
                </Text>
              </View>
              <View style={styles.invRight}>
                <Text style={[styles.invVal, { color: colors.foreground }]}>
                  {(price * inv.quantity).toLocaleString("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </Text>
                <View style={[styles.invGainBadge, { backgroundColor: isUp ? "#22C55E22" : "#EF444422" }]}>
                  <Text style={[styles.invGain, { color: isUp ? "#22C55E" : "#EF4444" }]}>
                    {isUp ? "+" : ""}{gain.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  greeting: { fontSize: 13, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: "800" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  netWorthCard: { borderRadius: 22, padding: 24, overflow: "hidden" },
  netWorthLabel: { fontSize: 13, color: "#0A0F1E", opacity: 0.65, marginBottom: 6 },
  netWorthValue: { fontSize: 42, fontWeight: "800", color: "#0A0F1E", marginBottom: 8 },
  netWorthGainRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  netWorthGain: { fontSize: 14, fontWeight: "600", color: "#0A0F1E" },
  chartWrap: { opacity: 0.45, marginHorizontal: -4 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "flex-start", gap: 6 },
  statIconBg: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 13, fontWeight: "700" },
  statLabel: { fontSize: 10 },
  savingsBar: { borderRadius: 14, padding: 14, marginTop: 12 },
  savingsBarTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  savingsBarLabel: { fontSize: 12 },
  savingsBarPct: { fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  coinsScroll: { marginHorizontal: -20, paddingLeft: 20 },
  coinCard: { borderRadius: 16, padding: 14, marginRight: 10, width: 120, marginBottom: 4 },
  coinHeader: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 },
  coinRank: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  coinRankText: { fontSize: 9, fontWeight: "700" },
  coinIconPlaceholder: { width: 32, height: 32, borderRadius: 16, marginBottom: 8 },
  coinNamePlaceholder: { width: 60, height: 12, borderRadius: 6 },
  coinSymbol: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  coinPrice: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  coinChangeBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  coinChange: { fontSize: 11, fontWeight: "700" },
  liveBadgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  liveBadgeSmallText: { fontSize: 11, fontWeight: "600" },
  placeholderCard: { borderRadius: 14, padding: 20, alignItems: "center", gap: 8, flexDirection: "row", justifyContent: "center" },
  placeholderText: { fontSize: 14 },
  insightCard: { borderRadius: 13, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  insightTitle: { fontSize: 14, fontWeight: "600" },
  insightMsg: { fontSize: 13, lineHeight: 18 },
  invRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  invBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  invBadgeText: { fontSize: 12, fontWeight: "800" },
  invMid: { flex: 1 },
  invName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  invSub: { fontSize: 12 },
  invRight: { alignItems: "flex-end", gap: 4 },
  invVal: { fontSize: 14, fontWeight: "600" },
  invGainBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  invGain: { fontSize: 12, fontWeight: "700" },
});

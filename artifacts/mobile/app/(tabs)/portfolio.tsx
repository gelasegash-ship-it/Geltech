import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Investment, useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { useLivePrices } from "@/hooks/useLivePrices";
import { MiniChart } from "@/components/MiniChart";

const CATEGORIES = ["stock", "crypto", "etf", "other"] as const;
const CAT_LABELS: Record<string, string> = { stock: "Action", crypto: "Crypto", etf: "ETF", other: "Autre" };

const catColors: Record<string, string> = {
  stock: "#3B82F6",
  crypto: "#F59E0B",
  etf: "#8B5CF6",
  other: "#6B7280",
};

// Simulated sparkline data (7 days trend) — positive for gainers, negative for losers
function generateSparkline(seed: number, isPositive: boolean): number[] {
  const points = 12;
  const result: number[] = [];
  let val = 100 + (seed % 20);
  for (let i = 0; i < points; i++) {
    const drift = isPositive ? 0.3 : -0.3;
    val += drift + (Math.sin(seed * i) * 2);
    result.push(Math.max(val, 50));
  }
  return result;
}

function InvestmentCard({
  inv,
  livePrice,
  onDelete,
  onUpdatePrice,
}: {
  inv: Investment;
  livePrice?: number;
  onDelete: () => void;
  onUpdatePrice: () => void;
}) {
  const colors = useColors();
  const effectivePrice = livePrice ?? inv.currentPrice;
  const totalValue = effectivePrice * inv.quantity;
  const totalCost = inv.buyPrice * inv.quantity;
  const gain = totalValue - totalCost;
  const gainPct = (gain / totalCost) * 100;
  const isPositive = gain >= 0;
  const isLive = !!livePrice;

  const sparkline = generateSparkline(inv.symbol.charCodeAt(0), isPositive);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardTop}>
        <View style={[styles.symbolBadge, { backgroundColor: catColors[inv.category] + "22" }]}>
          <Text style={[styles.symbolText, { color: catColors[inv.category] }]}>{inv.symbol.slice(0, 4)}</Text>
        </View>
        <View style={styles.cardMain}>
          <View style={styles.nameRow}>
            <Text style={[styles.assetName, { color: colors.foreground }]}>{inv.name}</Text>
            {isLive && (
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            )}
          </View>
          <Text style={[styles.assetCat, { color: colors.mutedForeground }]}>
            {CAT_LABELS[inv.category]} · {inv.quantity} unité{inv.quantity > 1 ? "s" : ""}
          </Text>
        </View>
        <MiniChart
          data={sparkline}
          width={70}
          height={36}
          color={isPositive ? colors.success : colors.destructive}
        />
      </View>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <View style={styles.cardStats}>
        <View>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Valeur</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {totalValue.toLocaleString("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.statMid}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {isLive ? "Prix live" : "Prix actuel"}
          </Text>
          <Text style={[styles.statValue, { color: isLive ? colors.success : colors.foreground }]}>
            ${effectivePrice.toFixed(effectivePrice < 1 ? 4 : 2)}
          </Text>
        </View>
        <View style={styles.statRight}>
          <Text style={[styles.gainText, { color: isPositive ? colors.success : colors.destructive }]}>
            {isPositive ? "+" : ""}{gainPct.toFixed(1)}%
          </Text>
          <Text style={[styles.gainAbs, { color: isPositive ? colors.success : colors.destructive }]}>
            {isPositive ? "+" : ""}{gain.toLocaleString("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable onPress={onUpdatePrice} style={[styles.actionBtn, { backgroundColor: colors.muted }]}>
          <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Modifier</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.actionBtn, { backgroundColor: colors.destructive + "22" }]}>
          <Feather name="trash-2" size={14} color={colors.destructive} />
          <Text style={[styles.actionText, { color: colors.destructive }]}>Supprimer</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, addInvestment, removeInvestment, updateInvestmentPrice, totalGains, totalInvested } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [showUpdatePrice, setShowUpdatePrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [form, setForm] = useState({
    symbol: "", name: "", category: "stock" as typeof CATEGORIES[number],
    quantity: "", buyPrice: "", currentPrice: "",
  });

  const symbols = data.investments.map((i) => i.symbol);
  const { prices: livePrices, loading: priceLoading, lastUpdated, refresh } = useLivePrices(symbols, 30000);

  // Auto-update investment prices when live prices arrive
  useEffect(() => {
    for (const inv of data.investments) {
      if (livePrices[inv.symbol] && livePrices[inv.symbol] !== inv.currentPrice) {
        updateInvestmentPrice(inv.id, livePrices[inv.symbol]);
      }
    }
  }, [livePrices]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalValue = data.investments.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
  const gainPct = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  const hasCrypto = data.investments.some((i) => i.category === "crypto");

  function handleAdd() {
    if (!form.symbol || !form.name || !form.quantity || !form.buyPrice || !form.currentPrice) {
      Alert.alert("Erreur", "Remplissez tous les champs");
      return;
    }
    addInvestment({
      symbol: form.symbol.toUpperCase(),
      name: form.name,
      category: form.category,
      quantity: parseFloat(form.quantity),
      buyPrice: parseFloat(form.buyPrice),
      currentPrice: parseFloat(form.currentPrice),
      currency: "USD",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setForm({ symbol: "", name: "", category: "stock", quantity: "", buyPrice: "", currentPrice: "" });
    setShowAdd(false);
  }

  function handleUpdatePrice() {
    if (!showUpdatePrice || !newPrice) return;
    updateInvestmentPrice(showUpdatePrice, parseFloat(newPrice));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowUpdatePrice(null);
    setNewPrice("");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Portfolio</Text>
        <View style={styles.headerRight}>
          {hasCrypto && (
            <Pressable
              style={[styles.syncBtn, { backgroundColor: priceLoading ? colors.muted : colors.success + "22" }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refresh(); }}
            >
              <Feather name={priceLoading ? "loader" : "refresh-cw"} size={14} color={priceLoading ? colors.mutedForeground : colors.success} />
              <Text style={[styles.syncText, { color: priceLoading ? colors.mutedForeground : colors.success }]}>
                {priceLoading ? "Sync..." : "Live"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {lastUpdated && (
        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          Mis à jour : {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </Text>
      )}

      <View style={[styles.summaryRow, { paddingHorizontal: 20 }]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Valeur totale</Text>
          <Text style={[styles.sumValue, { color: colors.foreground }]}>
            {totalValue.toLocaleString("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Performance</Text>
          <Text style={[styles.sumValue, { color: totalGains >= 0 ? colors.success : colors.destructive }]}>
            {totalGains >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
          </Text>
        </View>
      </View>

      <FlatList
        data={data.investments}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 20, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <InvestmentCard
            inv={item}
            livePrice={livePrices[item.symbol]}
            onDelete={() => {
              Alert.alert("Supprimer", `Supprimer ${item.name} ?`, [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: () => removeInvestment(item.id) },
              ]);
            }}
            onUpdatePrice={() => { setShowUpdatePrice(item.id); setNewPrice(item.currentPrice.toString()); }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="trending-up" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucun investissement</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Ajoutez votre premier actif</Text>
          </View>
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvel investissement</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.catBtn, { backgroundColor: form.category === c ? colors.primary : colors.muted }]}
                  onPress={() => setForm({ ...form, category: c })}
                >
                  <Text style={[styles.catBtnText, { color: form.category === c ? colors.primaryForeground : colors.mutedForeground }]}>
                    {CAT_LABELS[c]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {[
              { key: "symbol", label: form.category === "crypto" ? "Symbole (BTC, ETH, SOL...)" : "Symbole (AAPL, MSFT...)", placeholder: form.category === "crypto" ? "BTC" : "AAPL" },
              { key: "name", label: "Nom complet", placeholder: form.category === "crypto" ? "Bitcoin" : "Apple Inc." },
              { key: "quantity", label: "Quantité", placeholder: "1", keyboardType: "numeric" },
              { key: "buyPrice", label: "Prix d'achat ($)", placeholder: "0.00", keyboardType: "numeric" },
              { key: "currentPrice", label: "Prix actuel ($)", placeholder: "0.00", keyboardType: "numeric" },
            ].map((field) => (
              <View key={field.key} style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <TextInput
                  value={form[field.key as keyof typeof form]}
                  onChangeText={(v) => setForm({ ...form, [field.key]: v })}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType={(field.keyboardType as "default" | "numeric") || "default"}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  autoCapitalize="characters"
                />
              </View>
            ))}

            {form.category === "crypto" && (
              <View style={[styles.tipBox, { backgroundColor: colors.success + "11", borderColor: colors.success + "33" }]}>
                <Feather name="info" size={14} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.success }]}>
                  Les cryptos (BTC, ETH, SOL...) seront synchronisées automatiquement avec les prix en temps réel.
                </Text>
              </View>
            )}

            <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Ajouter l'investissement</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!showUpdatePrice} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mettre à jour le prix</Text>
            <Pressable onPress={() => { setShowUpdatePrice(null); setNewPrice(""); }}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nouveau prix ($)</Text>
            <TextInput
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              autoFocus
            />
          </View>
          <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleUpdatePrice}>
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Mettre à jour</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  syncBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  syncText: { fontSize: 12, fontWeight: "600" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  lastUpdated: { fontSize: 11, paddingHorizontal: 20, marginBottom: 10 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  sumLabel: { fontSize: 12, marginBottom: 4 },
  sumValue: { fontSize: 16, fontWeight: "700" },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  symbolBadge: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  symbolText: { fontSize: 12, fontWeight: "800" },
  cardMain: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  assetName: { fontSize: 15, fontWeight: "600" },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  assetCat: { fontSize: 12, marginTop: 2 },
  cardDivider: { height: 1, marginVertical: 12 },
  cardStats: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: "600" },
  statMid: { alignItems: "center" },
  statRight: { alignItems: "flex-end" },
  gainText: { fontSize: 16, fontWeight: "800" },
  gainAbs: { fontSize: 12, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: "600" },
  emptySubText: { fontSize: 14 },
  modal: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  catRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  catBtnText: { fontSize: 13, fontWeight: "600" },
  formField: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 40 },
  submitText: { fontSize: 16, fontWeight: "700" },
});

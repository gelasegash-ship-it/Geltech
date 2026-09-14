import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
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

import { DonutChart } from "@/components/DonutChart";
import { Transaction, useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";

const EXPENSE_CATS = ["Logement", "Alimentation", "Transport", "Loisirs", "Santé", "Vêtements", "Abonnements", "Autre"];
const INCOME_CATS = ["Salaire", "Freelance", "Investissements", "Business", "Dividendes", "Autre"];

const CAT_COLORS: Record<string, string> = {
  Logement: "#3B82F6", Alimentation: "#22C55E", Transport: "#F59E0B",
  Loisirs: "#8B5CF6", Santé: "#EF4444", Vêtements: "#EC4899",
  Abonnements: "#06B6D4", Autre: "#6B7280", Salaire: "#D4AF37",
  Freelance: "#10B981", Investissements: "#3B82F6", Business: "#F59E0B",
  Dividendes: "#22C55E",
};

function TransactionRow({ t, onDelete }: { t: Transaction; onDelete: () => void }) {
  const colors = useColors();
  const isIncome = t.type === "income";
  const color = CAT_COLORS[t.category] || colors.mutedForeground;
  const date = new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  return (
    <View style={[styles.txRow, { backgroundColor: colors.card }]}>
      <View style={[styles.txIcon, { backgroundColor: color + "22" }]}>
        <Feather name={isIncome ? "arrow-up-circle" : "arrow-down-circle"} size={18} color={color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txDesc, { color: colors.foreground }]}>{t.description}</Text>
        <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>{t.category} · {date}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isIncome ? colors.success : colors.destructive }]}>
          {isIncome ? "+" : "-"}{t.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
        </Text>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Feather name="x" size={13} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, addTransaction, removeTransaction, addSavingsGoal, removeSavingsGoal, monthlyExpenses, monthlySavings } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [form, setForm] = useState({ description: "", category: "Autre", amount: "" });
  const [showGoal, setShowGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", current: "" });
  const [tab, setTab] = useState<"overview" | "transactions" | "goals">("overview");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const savingsRate = data.monthlyIncome > 0 ? (monthlySavings / data.monthlyIncome) * 100 : 0;

  // Build donut segments from expense categories
  const expenseByCategory = data.transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const donutSegments = Object.entries(expenseByCategory).map(([cat, val]) => ({
    value: val,
    color: CAT_COLORS[cat] || "#6B7280",
    label: cat,
  }));

  function handleAddTx() {
    if (!form.description || !form.amount) { Alert.alert("Erreur", "Remplissez tous les champs"); return; }
    addTransaction({ type: txType, category: form.category, description: form.description, amount: parseFloat(form.amount), date: new Date().toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setForm({ description: "", category: "Autre", amount: "" });
    setShowAdd(false);
  }

  function handleAddGoal() {
    if (!goalForm.name || !goalForm.target) { Alert.alert("Erreur", "Remplissez le nom et l'objectif"); return; }
    addSavingsGoal({ name: goalForm.name, target: parseFloat(goalForm.target), current: parseFloat(goalForm.current) || 0, deadline: new Date(Date.now() + 365 * 86400000).toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGoalForm({ name: "", target: "", current: "" });
    setShowGoal(false);
  }

  const cats = txType === "income" ? INCOME_CATS : EXPENSE_CATS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Budget</Text>
        <View style={styles.headerBtns}>
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.muted }]} onPress={() => setShowGoal(true)}>
            <Feather name="target" size={17} color={colors.primary} />
          </Pressable>
          <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}>
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["overview", "transactions", "goals"] as const).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "overview" ? "Vue d'ensemble" : t === "transactions" ? "Transactions" : "Objectifs"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}>
        {tab === "overview" && (
          <View>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Feather name="arrow-up" size={14} color={colors.success} />
                <Text style={[styles.sumVal, { color: colors.success }]}>
                  +{data.monthlyIncome.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Revenus</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Feather name="arrow-down" size={14} color={colors.destructive} />
                <Text style={[styles.sumVal, { color: colors.destructive }]}>
                  -{monthlyExpenses.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Dépenses</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Feather name="save" size={14} color={colors.primary} />
                <Text style={[styles.sumVal, { color: monthlySavings >= 0 ? colors.primary : colors.destructive }]}>
                  {monthlySavings >= 0 ? "+" : ""}{monthlySavings.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Épargne</Text>
              </View>
            </View>

            {/* Donut chart */}
            {donutSegments.length > 0 && (
              <View style={[styles.donutCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.donutTitle, { color: colors.foreground }]}>Répartition des dépenses</Text>
                <View style={styles.donutRow}>
                  <DonutChart
                    segments={donutSegments}
                    size={160}
                    strokeWidth={22}
                    centerLabel="Total"
                    centerValue={monthlyExpenses.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  />
                  <View style={styles.legend}>
                    {donutSegments.map((seg) => {
                      const pct = ((seg.value / monthlyExpenses) * 100).toFixed(0);
                      return (
                        <View key={seg.label} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                          <View style={styles.legendInfo}>
                            <Text style={[styles.legendLabel, { color: colors.foreground }]}>{seg.label}</Text>
                            <Text style={[styles.legendVal, { color: colors.mutedForeground }]}>{seg.value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} · {pct}%</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Savings rate */}
            <View style={[styles.savingsCard, { backgroundColor: colors.card }]}>
              <View style={styles.savingsTop}>
                <Text style={[styles.savingsLabel, { color: colors.mutedForeground }]}>Taux d'épargne mensuel</Text>
                <Text style={[styles.savingsRate, { color: colors.primary }]}>{savingsRate.toFixed(0)}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(Math.max(savingsRate, 0), 100)}%` as `${number}%`,
                  backgroundColor: savingsRate >= 20 ? colors.success : savingsRate >= 10 ? colors.warning : colors.destructive,
                }]} />
              </View>
              <Text style={[styles.savingsHint, { color: colors.mutedForeground }]}>
                {savingsRate >= 20 ? "Excellent ! Continuez ainsi." : savingsRate >= 10 ? "Bien. Visez 20% ou plus." : "Essayez de réduire vos dépenses."}
              </Text>
            </View>

            {/* Recent transactions preview */}
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={[styles.recentTitle, { color: colors.foreground }]}>Récentes</Text>
                <Pressable onPress={() => setTab("transactions")}>
                  <Text style={[styles.recentLink, { color: colors.primary }]}>Voir tout</Text>
                </Pressable>
              </View>
              {data.transactions.slice(0, 4).map((t) => (
                <TransactionRow key={t.id} t={t} onDelete={() => removeTransaction(t.id)} />
              ))}
              {data.transactions.length === 0 && (
                <View style={styles.empty}>
                  <Feather name="credit-card" size={36} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucune transaction</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {tab === "transactions" && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {data.transactions.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="credit-card" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucune transaction</Text>
              </View>
            ) : (
              data.transactions.map((t) => (
                <TransactionRow key={t.id} t={t} onDelete={() => removeTransaction(t.id)} />
              ))
            )}
          </View>
        )}

        {tab === "goals" && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {data.savingsGoals.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="target" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucun objectif</Text>
                <Pressable style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowGoal(true)}>
                  <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Créer un objectif</Text>
                </Pressable>
              </View>
            ) : (
              data.savingsGoals.map((g) => {
                const pct = Math.min((g.current / g.target) * 100, 100);
                const deadline = new Date(g.deadline).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
                return (
                  <View key={g.id} style={[styles.goalCard, { backgroundColor: colors.card }]}>
                    <View style={styles.goalHeader}>
                      <View style={[styles.goalIcon, { backgroundColor: colors.primary + "22" }]}>
                        <Feather name="target" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={[styles.goalName, { color: colors.foreground }]}>{g.name}</Text>
                        <Text style={[styles.goalDeadline, { color: colors.mutedForeground }]}>Échéance: {deadline}</Text>
                      </View>
                      <Pressable onPress={() => removeSavingsGoal(g.id)}>
                        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.muted, marginVertical: 12 }]}>
                      <View style={[styles.progressFill, { width: `${pct}%` as `${number}%`, backgroundColor: pct >= 100 ? colors.success : colors.primary }]} />
                    </View>
                    <View style={styles.goalFooter}>
                      <Text style={[styles.goalCurrent, { color: colors.foreground }]}>
                        {g.current.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </Text>
                      <Text style={[styles.goalPct, { color: colors.primary }]}>{pct.toFixed(0)}%</Text>
                      <Text style={[styles.goalTarget, { color: colors.mutedForeground }]}>
                        / {g.target.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Add transaction modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvelle transaction</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.typeRow}>
              {(["expense", "income"] as const).map((type) => (
                <Pressable key={type}
                  style={[styles.typeBtn, { backgroundColor: txType === type ? colors.primary : colors.muted }]}
                  onPress={() => { setTxType(type); setForm({ ...form, category: "Autre" }); }}>
                  <Feather name={type === "expense" ? "arrow-down" : "arrow-up"} size={14} color={txType === type ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[styles.typeBtnText, { color: txType === type ? colors.primaryForeground : colors.mutedForeground }]}>
                    {type === "expense" ? "Dépense" : "Revenu"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 10 }]}>Catégorie</Text>
            <View style={styles.catGrid}>
              {cats.map((c) => (
                <Pressable key={c}
                  style={[styles.catChip, { backgroundColor: form.category === c ? (CAT_COLORS[c] || colors.primary) + "33" : colors.muted, borderWidth: form.category === c ? 1.5 : 0, borderColor: CAT_COLORS[c] || colors.primary }]}
                  onPress={() => setForm({ ...form, category: c })}>
                  <View style={[styles.catDot, { backgroundColor: CAT_COLORS[c] || colors.primary }]} />
                  <Text style={[styles.catChipText, { color: form.category === c ? colors.foreground : colors.mutedForeground }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            {[
              { key: "description", label: "Description", placeholder: "Ex: Loyer, courses..." },
              { key: "amount", label: "Montant (€)", placeholder: "0.00", keyboardType: "numeric" },
            ].map((f) => (
              <View key={f.key} style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput value={form[f.key as keyof typeof form]} onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                  placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground}
                  keyboardType={(f.keyboardType as "numeric") || "default"}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} />
              </View>
            ))}

            <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddTx}>
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Ajouter</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add goal modal */}
      <Modal visible={showGoal} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvel objectif</Text>
            <Pressable onPress={() => setShowGoal(false)}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {[
            { key: "name", label: "Nom de l'objectif", placeholder: "Ex: Vacances, Voiture..." },
            { key: "target", label: "Montant cible (€)", placeholder: "5000", keyboardType: "numeric" },
            { key: "current", label: "Montant actuel (€)", placeholder: "0", keyboardType: "numeric" },
          ].map((f) => (
            <View key={f.key} style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
              <TextInput value={goalForm[f.key as keyof typeof goalForm]} onChangeText={(v) => setGoalForm({ ...goalForm, [f.key]: v })}
                placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground}
                keyboardType={(f.keyboardType as "numeric") || "default"}
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} />
            </View>
          ))}
          <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddGoal}>
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Créer l'objectif</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  headerBtns: { flexDirection: "row", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", paddingHorizontal: 20, borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "flex-start", gap: 4 },
  sumVal: { fontSize: 14, fontWeight: "700" },
  sumLabel: { fontSize: 11 },
  donutCard: { marginHorizontal: 20, marginTop: 14, borderRadius: 18, padding: 18 },
  donutTitle: { fontSize: 15, fontWeight: "700", marginBottom: 16 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  legendInfo: { flex: 1 },
  legendLabel: { fontSize: 13, fontWeight: "500" },
  legendVal: { fontSize: 11, marginTop: 1 },
  savingsCard: { marginHorizontal: 20, marginTop: 14, borderRadius: 16, padding: 16 },
  savingsTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  savingsLabel: { fontSize: 13 },
  savingsRate: { fontSize: 16, fontWeight: "800" },
  savingsHint: { fontSize: 12, marginTop: 8 },
  progressTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  recentSection: { paddingHorizontal: 20, paddingTop: 20 },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  recentTitle: { fontSize: 17, fontWeight: "700" },
  recentLink: { fontSize: 14, fontWeight: "600" },
  txRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, marginBottom: 8, gap: 10 },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  txMeta: { fontSize: 11 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  goalCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 15, fontWeight: "600" },
  goalDeadline: { fontSize: 12, marginTop: 2 },
  goalFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  goalCurrent: { fontSize: 15, fontWeight: "700" },
  goalPct: { fontSize: 14, fontWeight: "600" },
  goalTarget: { fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "500" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { fontSize: 15, fontWeight: "600" },
  modal: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  typeBtnText: { fontSize: 15, fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catChipText: { fontSize: 13, fontWeight: "500" },
  formField: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  submitBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 40 },
  submitText: { fontSize: 16, fontWeight: "700" },
});

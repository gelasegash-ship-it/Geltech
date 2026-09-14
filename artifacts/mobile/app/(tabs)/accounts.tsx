import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

import { BankAccount, useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { CURRENCIES } from "@/hooks/useExchangeRates";

const ACCOUNT_TYPES = [
  { id: "checking", label: "Compte courant", icon: "credit-card", color: "#3B82F6" },
  { id: "savings", label: "Épargne", icon: "save", color: "#22C55E" },
  { id: "livret_a", label: "Livret A", icon: "book", color: "#D4AF37" },
  { id: "pel", label: "PEL", icon: "home", color: "#8B5CF6" },
  { id: "cel", label: "CEL", icon: "key", color: "#F59E0B" },
  { id: "pro", label: "Compte pro", icon: "briefcase", color: "#06B6D4" },
  { id: "other", label: "Autre", icon: "archive", color: "#6B7280" },
] as const;

const ACCOUNT_COLORS = [
  "#3B82F6", "#22C55E", "#D4AF37", "#8B5CF6",
  "#F59E0B", "#EF4444", "#06B6D4", "#EC4899",
];

const POPULAR_BANKS = [
  { name: "BNP Paribas", emoji: "🏦" },
  { name: "Société Générale", emoji: "🏦" },
  { name: "Crédit Agricole", emoji: "🌿" },
  { name: "LCL", emoji: "🏦" },
  { name: "Caisse d'Épargne", emoji: "🐰" },
  { name: "Banque Populaire", emoji: "🏦" },
  { name: "Boursorama", emoji: "📱" },
  { name: "Hello bank!", emoji: "👋" },
  { name: "N26", emoji: "🟢" },
  { name: "Revolut", emoji: "💳" },
  { name: "Fortuneo", emoji: "⭐" },
  { name: "Orange Bank", emoji: "🟠" },
  { name: "La Banque Postale", emoji: "✉️" },
  { name: "CIC", emoji: "🏦" },
  { name: "Crédit Mutuel", emoji: "🔵" },
  { name: "AXA Banque", emoji: "🛡️" },
  { name: "HSBC", emoji: "🔴" },
  { name: "Monabanq", emoji: "💛" },
  { name: "Ecobank", emoji: "🌍" },
  { name: "Afriland First Bank", emoji: "🌍" },
  { name: "UBA", emoji: "🌍" },
  { name: "CFA Bank", emoji: "🌍" },
  { name: "Autre banque", emoji: "🏦" },
];

const TYPE_LABELS: Record<string, string> = {
  checking: "Compte courant", savings: "Épargne",
  livret_a: "Livret A", pel: "PEL", cel: "CEL", pro: "Compte pro", other: "Autre",
};

function AccountCard({
  account,
  onEdit,
  onDelete,
  onUpdateBalance,
}: {
  account: BankAccount;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateBalance: () => void;
}) {
  const colors = useColors();
  const typeInfo = ACCOUNT_TYPES.find((t) => t.id === account.accountType);
  const updated = new Date(account.lastUpdated).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const currency = CURRENCIES.find((c) => c.code === account.currency);

  return (
    <View style={[styles.accountCard, { backgroundColor: colors.card }]}>
      <LinearGradient
        colors={[account.color + "33", account.color + "11"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={styles.cardTop}>
        <View style={[styles.bankIcon, { backgroundColor: account.color + "33" }]}>
          <Feather name={(typeInfo?.icon ?? "credit-card") as "save"} size={20} color={account.color} />
        </View>
        <View style={styles.bankInfo}>
          <Text style={[styles.bankName, { color: colors.foreground }]}>{account.bankName}</Text>
          <Text style={[styles.accountType, { color: colors.mutedForeground }]}>
            {TYPE_LABELS[account.accountType]}
            {account.lastFourDigits ? ` · ****${account.lastFourDigits}` : ""}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={onDelete} hitSlop={10}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.balance, { color: colors.foreground }]}>
        {account.balance.toLocaleString("fr-FR", { style: "currency", currency: account.currency, maximumFractionDigits: 2 })}
      </Text>
      {account.currency !== "EUR" && currency && (
        <Text style={[styles.balanceSub, { color: colors.mutedForeground }]}>{currency.name}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={[styles.updated, { color: colors.mutedForeground }]}>Mis à jour: {updated}</Text>
        <Pressable
          style={[styles.updateBtn, { backgroundColor: account.color + "22", borderColor: account.color + "44" }]}
          onPress={onUpdateBalance}
        >
          <Feather name="edit-3" size={13} color={account.color} />
          <Text style={[styles.updateBtnText, { color: account.color }]}>Actualiser solde</Text>
        </Pressable>
      </View>

      {account.note ? (
        <Text style={[styles.note, { color: colors.mutedForeground }]}>{account.note}</Text>
      ) : null}
    </View>
  );
}

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, addBankAccount, updateBankAccount, removeBankAccount, totalBankBalance } = useAppData();

  const [showAdd, setShowAdd] = useState(false);
  const [showUpdateBalance, setShowUpdateBalance] = useState<BankAccount | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [addStep, setAddStep] = useState<"bank" | "details">("bank");
  const [form, setForm] = useState({
    bankName: "",
    accountType: "checking" as BankAccount["accountType"],
    balance: "",
    currency: "EUR",
    lastFourDigits: "",
    color: ACCOUNT_COLORS[0],
    note: "",
  });
  const [bankSearch, setBankSearch] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const filteredBanks = POPULAR_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  function resetForm() {
    setForm({ bankName: "", accountType: "checking", balance: "", currency: "EUR", lastFourDigits: "", color: ACCOUNT_COLORS[0], note: "" });
    setAddStep("bank");
    setBankSearch("");
  }

  function handleAdd() {
    if (!form.bankName || !form.balance) {
      Alert.alert("Erreur", "Remplissez le nom et le solde.");
      return;
    }
    addBankAccount({
      bankName: form.bankName,
      accountType: form.accountType,
      balance: parseFloat(form.balance),
      currency: form.currency,
      lastFourDigits: form.lastFourDigits || undefined,
      color: form.color,
      lastUpdated: new Date().toISOString(),
      note: form.note || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setShowAdd(false);
  }

  function handleUpdateBalance() {
    if (!showUpdateBalance || !newBalance) return;
    updateBankAccount(showUpdateBalance.id, { balance: parseFloat(newBalance) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowUpdateBalance(null);
    setNewBalance("");
  }

  const totalByType: Record<string, number> = {};
  data.bankAccounts.forEach((a) => {
    totalByType[a.accountType] = (totalByType[a.accountType] || 0) + a.balance;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Mes Comptes</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      >
        {/* Total balance hero */}
        <LinearGradient colors={["#1A2340", "#111828"]} style={styles.heroCard}>
          <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Solde total bancaire</Text>
          <Text style={[styles.heroBalance, { color: colors.primary }]}>
            {totalBankBalance.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Feather name="credit-card" size={13} color={colors.mutedForeground} />
              <Text style={[styles.heroStatText, { color: colors.mutedForeground }]}>
                {data.bankAccounts.length} compte{data.bankAccounts.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {Object.entries(totalByType).slice(0, 2).map(([type, val]) => (
              <View key={type} style={styles.heroStat}>
                <Text style={[styles.heroStatText, { color: colors.mutedForeground }]}>
                  {TYPE_LABELS[type]}: {val.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Entrez manuellement vos soldes depuis votre application bancaire. Le total est inclus dans votre patrimoine net.
          </Text>
        </View>

        {/* Accounts list */}
        <View style={styles.listSection}>
          {data.bankAccounts.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="credit-card" size={40} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun compte ajouté</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Ajoutez vos comptes bancaires pour inclure vos soldes dans votre patrimoine net.
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowAdd(true)}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Ajouter un compte</Text>
              </Pressable>
            </View>
          ) : (
            data.bankAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => {}}
                onUpdateBalance={() => { setShowUpdateBalance(account); setNewBalance(account.balance.toString()); }}
                onDelete={() =>
                  Alert.alert("Supprimer", `Supprimer le compte ${account.bankName} ?`, [
                    { text: "Annuler", style: "cancel" },
                    { text: "Supprimer", style: "destructive", onPress: () => removeBankAccount(account.id) },
                  ])
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Add account modal — 2 steps */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                {addStep === "details" && (
                  <Pressable onPress={() => setAddStep("bank")} style={{ marginRight: 12 }}>
                    <Feather name="arrow-left" size={22} color={colors.foreground} />
                  </Pressable>
                )}
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {addStep === "bank" ? "Choisir une banque" : "Détails du compte"}
                </Text>
              </View>
              <Pressable onPress={() => { resetForm(); setShowAdd(false); }}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Step 1: Choose bank */}
            {addStep === "bank" && (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TextInput
                  value={bankSearch}
                  onChangeText={setBankSearch}
                  placeholder="Rechercher une banque..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                />
                <View style={styles.bankGrid}>
                  {filteredBanks.map((bank) => (
                    <Pressable
                      key={bank.name}
                      style={[
                        styles.bankChip,
                        { backgroundColor: form.bankName === bank.name ? colors.primary + "22" : colors.card },
                        form.bankName === bank.name && { borderColor: colors.primary, borderWidth: 1.5 },
                      ]}
                      onPress={() => setForm({ ...form, bankName: bank.name })}
                    >
                      <Text style={styles.bankEmoji}>{bank.emoji}</Text>
                      <Text style={[styles.bankChipName, { color: colors.foreground }]} numberOfLines={2}>{bank.name}</Text>
                      {form.bankName === bank.name && (
                        <Feather name="check-circle" size={14} color={colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>

                {/* Custom name */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Ou saisissez un nom personnalisé
                  </Text>
                  <TextInput
                    value={form.bankName.includes(POPULAR_BANKS.map((b) => b.name).join("")) ? "" : (POPULAR_BANKS.some((b) => b.name === form.bankName) ? "" : form.bankName)}
                    onChangeText={(v) => setForm({ ...form, bankName: v })}
                    placeholder="Nom de votre banque..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>

                <Pressable
                  style={[styles.nextBtn, { backgroundColor: form.bankName ? colors.primary : colors.muted }]}
                  onPress={() => { if (form.bankName) setAddStep("details"); }}
                  disabled={!form.bankName}
                >
                  <Text style={[styles.nextBtnText, { color: form.bankName ? colors.primaryForeground : colors.mutedForeground }]}>
                    Continuer
                  </Text>
                  <Feather name="arrow-right" size={18} color={form.bankName ? colors.primaryForeground : colors.mutedForeground} />
                </Pressable>
              </ScrollView>
            )}

            {/* Step 2: Account details */}
            {addStep === "details" && (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Bank name preview */}
                <View style={[styles.selectedBank, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "22" }]}>
                  <Text style={[styles.selectedBankName, { color: colors.primary }]}>{form.bankName}</Text>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                </View>

                {/* Account type */}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 10 }]}>Type de compte</Text>
                <View style={styles.typeGrid}>
                  {ACCOUNT_TYPES.map((t) => (
                    <Pressable
                      key={t.id}
                      style={[
                        styles.typeCard,
                        { backgroundColor: form.accountType === t.id ? t.color + "22" : colors.card },
                        form.accountType === t.id && { borderColor: t.color, borderWidth: 1.5 },
                      ]}
                      onPress={() => setForm({ ...form, accountType: t.id, color: t.color })}
                    >
                      <Feather name={t.icon as "save"} size={18} color={form.accountType === t.id ? t.color : colors.mutedForeground} />
                      <Text style={[styles.typeLabel, { color: form.accountType === t.id ? colors.foreground : colors.mutedForeground }]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Balance */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Solde actuel</Text>
                  <View style={[styles.balanceRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <TextInput
                      value={form.balance}
                      onChangeText={(v) => setForm({ ...form, balance: v })}
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      style={[styles.balanceInput, { color: colors.foreground }]}
                      autoFocus
                    />
                    <Pressable
                      style={[styles.currencyPill, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const idx = ["EUR", "USD", "GBP", "XOF", "XAF"].indexOf(form.currency);
                        setForm({ ...form, currency: ["EUR", "USD", "GBP", "XOF", "XAF"][(idx + 1) % 5] });
                      }}
                    >
                      <Text style={[styles.currencyPillText, { color: colors.foreground }]}>{form.currency}</Text>
                      <Feather name="refresh-cw" size={11} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>

                {/* Last 4 digits (optional) */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>4 derniers chiffres (optionnel)</Text>
                  <TextInput
                    value={form.lastFourDigits}
                    onChangeText={(v) => setForm({ ...form, lastFourDigits: v.slice(0, 4) })}
                    placeholder="1234"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>

                {/* Color */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Couleur du compte</Text>
                  <View style={styles.colorRow}>
                    {ACCOUNT_COLORS.map((c) => (
                      <Pressable
                        key={c}
                        style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotSelected]}
                        onPress={() => setForm({ ...form, color: c })}
                      >
                        {form.color === c && <Feather name="check" size={14} color="#fff" />}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Note */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optionnel)</Text>
                  <TextInput
                    value={form.note}
                    onChangeText={(v) => setForm({ ...form, note: v })}
                    placeholder="Ex: compte principal, livret enfant..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>

                <Pressable
                  style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAdd}
                >
                  <Feather name="check" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>Ajouter le compte</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Update balance modal */}
      <Modal visible={!!showUpdateBalance} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Actualiser le solde
              </Text>
              <Pressable onPress={() => { setShowUpdateBalance(null); setNewBalance(""); }}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {showUpdateBalance && (
              <View style={[styles.accountPreview, { backgroundColor: colors.card }]}>
                <View style={[styles.bankIcon, { backgroundColor: showUpdateBalance.color + "33" }]}>
                  <Feather name="credit-card" size={18} color={showUpdateBalance.color} />
                </View>
                <View>
                  <Text style={[styles.bankName, { color: colors.foreground }]}>{showUpdateBalance.bankName}</Text>
                  <Text style={[styles.accountType, { color: colors.mutedForeground }]}>
                    {TYPE_LABELS[showUpdateBalance.accountType]}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.updateHint, { color: colors.mutedForeground }]}>
              Consultez votre app bancaire et saisissez le solde actuel de ce compte.
            </Text>

            <View style={[styles.balanceRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={newBalance}
                onChangeText={setNewBalance}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[styles.balanceInput, { color: colors.foreground, fontSize: 32 }]}
                autoFocus
              />
              <Text style={[styles.currencyPillText, { color: colors.mutedForeground, marginRight: 16 }]}>
                {showUpdateBalance?.currency ?? "EUR"}
              </Text>
            </View>

            {showUpdateBalance && (
              <Text style={[styles.prevBalance, { color: colors.mutedForeground }]}>
                Solde précédent : {showUpdateBalance.balance.toLocaleString("fr-FR", { style: "currency", currency: showUpdateBalance.currency })}
              </Text>
            )}

            <Pressable style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={handleUpdateBalance}>
              <Feather name="check" size={18} color={colors.primaryForeground} />
              <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>Enregistrer le solde</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroCard: { marginHorizontal: 20, borderRadius: 20, padding: 22, marginBottom: 14 },
  heroLabel: { fontSize: 13, marginBottom: 6 },
  heroBalance: { fontSize: 36, fontWeight: "800", marginBottom: 12 },
  heroStats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroStatText: { fontSize: 12 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 20, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  listSection: { paddingHorizontal: 20 },
  accountCard: { borderRadius: 18, padding: 18, marginBottom: 14, overflow: "hidden" },
  cardGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  bankIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 16, fontWeight: "700" },
  accountType: { fontSize: 12, marginTop: 2 },
  cardActions: { gap: 8 },
  balance: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  balanceSub: { fontSize: 12, marginBottom: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  updated: { fontSize: 11 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  updateBtnText: { fontSize: 12, fontWeight: "600" },
  note: { fontSize: 12, marginTop: 10, fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { fontSize: 15, fontWeight: "600" },
  modal: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitleRow: { flexDirection: "row", alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  searchInput: { borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 16 },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  bankChip: { borderRadius: 14, padding: 12, alignItems: "center", width: "30%", gap: 6 },
  bankEmoji: { fontSize: 22 },
  bankChipName: { fontSize: 11, textAlign: "center", fontWeight: "500" },
  selectedBank: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  selectedBankName: { fontSize: 16, fontWeight: "700" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  typeCard: { borderRadius: 14, padding: 14, alignItems: "center", gap: 8, width: "31%" },
  typeLabel: { fontSize: 11, textAlign: "center", fontWeight: "500" },
  formField: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  balanceRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingLeft: 20 },
  balanceInput: { flex: 1, fontSize: 28, fontWeight: "700", paddingVertical: 18 },
  currencyPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8 },
  currencyPillText: { fontSize: 14, fontWeight: "700" },
  colorRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14, marginTop: 8, marginBottom: 40 },
  nextBtnText: { fontSize: 16, fontWeight: "700" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 18, borderRadius: 16, marginBottom: 40 },
  confirmBtnText: { fontSize: 17, fontWeight: "700" },
  accountPreview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, marginBottom: 16 },
  updateHint: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  prevBalance: { fontSize: 13, marginTop: 12, textAlign: "center" },
});

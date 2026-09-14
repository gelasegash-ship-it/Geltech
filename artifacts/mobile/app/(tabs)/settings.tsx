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

import { useAppData } from "@/contexts/AppDataContext";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { useColors } from "@/hooks/useColors";
import { CURRENCIES } from "@/hooks/useExchangeRates";

const PREFERRED_CURRENCIES = ["EUR", "USD", "GBP", "XOF", "XAF", "NGN", "MAD", "GHS", "CHF", "CAD"];

function SettingRow({
  icon, label, value, onPress, colors, danger = false,
}: {
  icon: string; label: string; value?: string; onPress?: () => void;
  colors: ReturnType<typeof useColors>; danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? colors.destructive + "22" : colors.muted }]}>
        <Feather name={icon as "user"} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
        {!danger && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, setMonthlyIncome, setMonthlyBudget, updateAISettings } = useAppData();

  const [showIncome, setShowIncome] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [incomeVal, setIncomeVal] = useState(data.monthlyIncome.toString());
  const [budgetVal, setBudgetVal] = useState(data.monthlyBudget.toString());
  const [preferredCurrency, setPreferredCurrency] = useState("EUR");
  const [showCurrency, setShowCurrency] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const currency = CURRENCIES.find((c) => c.code === preferredCurrency);

  function saveIncome() {
    const val = parseFloat(incomeVal);
    if (!isNaN(val) && val >= 0) {
      setMonthlyIncome(val);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowIncome(false);
    }
  }

  function saveBudget() {
    const val = parseFloat(budgetVal);
    if (!isNaN(val) && val >= 0) {
      setMonthlyBudget(val);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBudget(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      >
        {/* Profile header */}
        <LinearGradient colors={["#1A2340", "#0A0F1E"]} style={[styles.profileHeader, { paddingTop: topPad + 20 }]}>
          <LinearGradient colors={["#D4AF37", "#B8941E"]} style={styles.avatar}>
            <Feather name="user" size={32} color="#0A0F1E" />
          </LinearGradient>
          <Text style={[styles.profileName, { color: colors.foreground }]}>Mon Profil WealthAI</Text>
          <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>Gérez vos préférences financières</Text>
        </LinearGradient>

        {/* Financial settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FINANCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SettingRow
              icon="dollar-sign"
              label="Revenu mensuel"
              value={`${data.monthlyIncome.toLocaleString("fr-FR")} €`}
              onPress={() => { setIncomeVal(data.monthlyIncome.toString()); setShowIncome(true); }}
              colors={colors}
            />
            <SettingRow
              icon="sliders"
              label="Budget mensuel"
              value={`${data.monthlyBudget.toLocaleString("fr-FR")} €`}
              onPress={() => { setBudgetVal(data.monthlyBudget.toString()); setShowBudget(true); }}
              colors={colors}
            />
            <SettingRow
              icon="globe"
              label="Devise préférée"
              value={`${currency?.flag} ${preferredCurrency}`}
              onPress={() => setShowCurrency(true)}
              colors={colors}
            />
          </View>
        </View>

        {/* Secure account connections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CONNEXIONS SÉCURISÉES</Text>
          <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.primary + "55" }]}>
            <View style={[styles.connectionIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="link" size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.connectionTitle, { color: colors.foreground }]}>Comptes réels</Text>
              <Text style={[styles.connectionSub, { color: colors.mutedForeground }]}>
                Aucun fournisseur autorisé pour le moment
              </Text>
            </View>
            <View style={[styles.pendingPill, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.pendingPillText, { color: colors.primary }]}>En attente</Text>
            </View>
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            WealthAI n’enregistre jamais tes identifiants bancaires. Une connexion autorisée permettra de synchroniser soldes et transactions, sans mouvement d’argent automatique.
          </Text>
          <Pressable
            style={[styles.connectButton, { borderColor: colors.primary }]}
            onPress={() => Alert.alert(
              "Autorisation nécessaire",
              "Choisis un fournisseur bancaire sécurisé dans la fenêtre de connexion. Aucun compte réel n’est encore relié à WealthAI.",
              [{ text: "Compris" }]
            )}
          >
            <Feather name="plus" size={17} color={colors.primary} />
            <Text style={[styles.connectButtonText, { color: colors.primary }]}>Ajouter un fournisseur</Text>
          </Pressable>
        </View>

        {/* Access and billing */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCÈS ET ABONNEMENT</Text>
          <SubscriptionCard />
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Le mode gratuit reste disponible pour les fonctions de base. Les fonctions avancées
            sont protégées par abonnement et les droits sont vérifiés par RevenueCat.
          </Text>
        </View>

        {/* AI guardrails */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PILOTE IA</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SettingRow
              icon="radio"
              label="Apprentissage de vos habitudes"
              value={data.aiSettings.learningEnabled ? "Actif" : "Inactif"}
              onPress={() => updateAISettings({ learningEnabled: !data.aiSettings.learningEnabled })}
              colors={colors}
            />
            <SettingRow
              icon="alert-triangle"
              label="Détection d’anomalies"
              value={data.aiSettings.anomalyAlertsEnabled ? "Active" : "Inactive"}
              onPress={() => updateAISettings({ anomalyAlertsEnabled: !data.aiSettings.anomalyAlertsEnabled })}
              colors={colors}
            />
            <SettingRow
              icon="tag"
              label="Catégorisation automatique"
              value={data.aiSettings.autoCategorizationEnabled ? "Active" : "Inactive"}
              onPress={() => updateAISettings({ autoCategorizationEnabled: !data.aiSettings.autoCategorizationEnabled })}
              colors={colors}
            />
            <SettingRow
              icon="check-circle"
              label="Validation avant action sensible"
              value={data.aiSettings.requireApprovalForActions ? "Toujours" : "Désactivée"}
              onPress={() => updateAISettings({ requireApprovalForActions: !data.aiSettings.requireApprovalForActions })}
              colors={colors}
            />
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            L’IA peut apprendre, analyser et préparer des actions. Les virements, retraits et changements importants restent soumis à ta validation.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>STATISTIQUES</Text>
          <View style={[styles.statsGrid, { backgroundColor: colors.card }]}>
            {[
              { label: "Investissements", value: data.investments.length.toString(), icon: "trending-up", color: "#3B82F6" },
              { label: "Transactions", value: data.transactions.length.toString(), icon: "credit-card", color: "#22C55E" },
              { label: "Objectifs", value: data.savingsGoals.length.toString(), icon: "target", color: "#D4AF37" },
              { label: "Retraits", value: data.withdrawals.length.toString(), icon: "arrow-up-right", color: "#8B5CF6" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + "22" }]}>
                  <Feather name={stat.icon as "target"} size={18} color={stat.color} />
                </View>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* App settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPLICATION</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SettingRow icon="bell" label="Notifications" value="Activées" onPress={() => {}} colors={colors} />
            <SettingRow icon="shield" label="Confidentialité" value="Protégé" onPress={() => {}} colors={colors} />
            <SettingRow icon="refresh-cw" label="Synchronisation" value="Toutes les 30s" onPress={() => {}} colors={colors} />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>À PROPOS</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SettingRow icon="info" label="Version" value="1.0.0" colors={colors} />
            <SettingRow icon="cpu" label="Modèle IA" value="GPT-5.4" colors={colors} />
            <SettingRow icon="activity" label="API Marchés" value="CoinGecko" colors={colors} />
            <SettingRow icon="refresh-cw" label="Taux de change" value="open.er-api.com" colors={colors} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SettingRow
              icon="trash-2"
              label="Réinitialiser les données"
              danger
              onPress={() => {
                Alert.alert(
                  "Réinitialiser",
                  "Cette action supprimera toutes vos données. Continuer ?",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "Réinitialiser", style: "destructive", onPress: () => {} },
                  ]
                );
              }}
              colors={colors}
            />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          WealthAI · Votre conseiller financier intelligent
        </Text>
      </ScrollView>

      {/* Income modal */}
      <Modal visible={showIncome} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Revenu mensuel</Text>
              <Pressable onPress={() => setShowIncome(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Votre revenu net mensuel (après impôts)
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.inputCurrency, { color: colors.mutedForeground }]}>€</Text>
              <TextInput
                value={incomeVal}
                onChangeText={setIncomeVal}
                placeholder="3500"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[styles.bigInput, { color: colors.foreground }]}
                autoFocus
              />
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveIncome}>
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Enregistrer</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Budget modal */}
      <Modal visible={showBudget} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Budget mensuel</Text>
              <Pressable onPress={() => setShowBudget(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Votre budget de dépenses mensuel cible
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.inputCurrency, { color: colors.mutedForeground }]}>€</Text>
              <TextInput
                value={budgetVal}
                onChangeText={setBudgetVal}
                placeholder="2000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[styles.bigInput, { color: colors.foreground }]}
                autoFocus
              />
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveBudget}>
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Enregistrer</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Currency modal */}
      <Modal visible={showCurrency} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Devise préférée</Text>
            <Pressable onPress={() => setShowCurrency(false)}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView>
            {PREFERRED_CURRENCIES.map((code) => {
              const cur = CURRENCIES.find((c) => c.code === code);
              if (!cur) return null;
              return (
                <Pressable
                  key={code}
                  style={[styles.currencyRow, { borderBottomColor: colors.border }, preferredCurrency === code && { backgroundColor: colors.primary + "22" }]}
                  onPress={() => { setPreferredCurrency(code); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCurrency(false); }}
                >
                  <Text style={styles.currencyFlag}>{cur.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.currencyCode, { color: colors.foreground }]}>{cur.code}</Text>
                    <Text style={[styles.currencyName, { color: colors.mutedForeground }]}>{cur.name}</Text>
                  </View>
                  <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>{cur.symbol}</Text>
                  {preferredCurrency === code && <Feather name="check" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: "center", paddingBottom: 32, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  profileName: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  profileSub: { fontSize: 14 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 10 },
  card: { borderRadius: 16, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 14 },
  statsGrid: { borderRadius: 16, padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statItem: { width: "44%", alignItems: "center", gap: 6 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12 },
  footer: { textAlign: "center", fontSize: 12, marginTop: 24, marginBottom: 8, paddingHorizontal: 20 },
  modal: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  modalSub: { fontSize: 14, marginBottom: 24 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, marginBottom: 24 },
  inputCurrency: { fontSize: 24, fontWeight: "300", marginRight: 8 },
  bigInput: { flex: 1, fontSize: 36, fontWeight: "700", paddingVertical: 20 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "700" },
  currencyRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 12 },
  currencyFlag: { fontSize: 24 },
  currencyCode: { fontSize: 15, fontWeight: "700" },
  currencyName: { fontSize: 12, marginTop: 2 },
  currencySymbol: { fontSize: 14, marginRight: 8 },
  connectionCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  connectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  connectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  connectionSub: { fontSize: 12 },
  pendingPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  pendingPillText: { fontSize: 10, fontWeight: "700" },
  helperText: { fontSize: 12, lineHeight: 18, marginTop: 9, paddingHorizontal: 2 },
  connectButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 13, padding: 13, marginTop: 12 },
  connectButtonText: { fontSize: 14, fontWeight: "700" },
});

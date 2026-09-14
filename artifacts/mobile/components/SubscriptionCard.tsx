import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSubscription } from "@/lib/revenuecat";
import { useColors } from "@/hooks/useColors";

export function SubscriptionCard() {
  const colors = useColors();
  const {
    offering,
    isConfigured,
    isPremium,
    isLoading,
    isPurchasing,
    isRestoring,
    purchase,
    restore,
  } = useSubscription();
  const packageToPurchase = offering?.availablePackages?.[0];

  async function buyPremium() {
    if (!packageToPurchase) return;

    try {
      await purchase(packageToPurchase);
      Alert.alert("Premium activé", "Les fonctionnalités avancées sont maintenant disponibles.");
    } catch (error) {
      const message = String(error);
      if (!message.toLowerCase().includes("cancel")) {
        Alert.alert("Achat impossible", "Vérifiez votre connexion puis réessayez.");
      }
    }
  }

  async function restorePremium() {
    try {
      const customerInfo = await restore();
      const restored = customerInfo.entitlements.active?.wealthai_premium !== undefined;
      Alert.alert(
        restored ? "Abonnement restauré" : "Aucun abonnement trouvé",
        restored
          ? "Votre accès Premium est de nouveau actif."
          : "Aucun achat WealthAI Premium n’a été trouvé sur ce compte.",
      );
    } catch {
      Alert.alert("Restauration impossible", "Vérifiez votre connexion puis réessayez.");
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPremium ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name={isPremium ? "check-circle" : "zap"} size={20} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isPremium ? "WealthAI Premium actif" : "Débloquer WealthAI Premium"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isPremium
              ? "Votre abonnement est reconnu par RevenueCat."
              : "Plus d’analyses IA, de plans et d’opportunités personnalisées."}
          </Text>
        </View>
      </View>

      {!isPremium && (
        <View style={styles.bullets}>
          {[
            "Plans financiers avancés",
            "Analyses d’opportunités et d’anomalies",
            "Accès étendu aux outils WealthAI",
          ].map((label) => (
            <View key={label} style={styles.bullet}>
              <Feather name="check" size={14} color={colors.success} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {!isConfigured ? (
        <Text style={[styles.notice, { color: colors.warning }]}>
          La configuration de paiement doit encore être publiée dans les magasins d’applications.
        </Text>
      ) : isPremium ? (
        <Pressable
          testID="restore-premium-button"
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={restorePremium}
          disabled={isRestoring}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
          <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
            {isRestoring ? "Restauration…" : "Vérifier mon abonnement"}
          </Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            testID="purchase-premium-button"
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={buyPremium}
            disabled={isLoading || isPurchasing || !packageToPurchase}
          >
            <Feather name="lock" size={16} color={colors.primaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              {isPurchasing
                ? "Ouverture du paiement…"
                : packageToPurchase
                  ? `Passer Premium · ${packageToPurchase.product.priceString}`
                  : "Offre bientôt disponible"}
            </Text>
          </Pressable>
          <Pressable
            testID="restore-premium-button"
            style={styles.restoreButton}
            onPress={restorePremium}
            disabled={isRestoring}
          >
            <Text style={[styles.restoreButtonText, { color: colors.mutedForeground }]}>
              {isRestoring ? "Restauration…" : "Restaurer un achat"}
            </Text>
          </Pressable>
        </>
      )}
      <Text style={[styles.legal, { color: colors.mutedForeground }]}>
        Les paiements sont traités par la boutique et RevenueCat. Les transferts d’argent ne
        sont jamais lancés automatiquement par l’IA.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 3 },
  subtitle: { fontSize: 12, lineHeight: 17 },
  bullets: { gap: 8, marginTop: 16 },
  bullet: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { fontSize: 13 },
  notice: { fontSize: 12, lineHeight: 17, marginTop: 16 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: 13, marginTop: 16 },
  primaryButtonText: { fontSize: 13, fontWeight: "800" },
  secondaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16 },
  secondaryButtonText: { fontSize: 13, fontWeight: "700" },
  restoreButton: { alignItems: "center", padding: 10 },
  restoreButtonText: { fontSize: 12, fontWeight: "600" },
  legal: { fontSize: 10, lineHeight: 15, marginTop: 8 },
});
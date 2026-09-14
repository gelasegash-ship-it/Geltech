import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";

const BASE_URL = process.env["EXPO_PUBLIC_DOMAIN"]
  ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`
  : "";

interface Idea {
  id: string;
  title: string;
  category: string;
  potential: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
  timeToStart: string;
  description: string;
  steps: string[];
}

const FALLBACK_IDEAS: Idea[] = [
  { id: "f1", title: "ETF World index", category: "Investment", potential: "€50 - €500/mois", difficulty: "Facile", timeToStart: "1 jour", description: "Investissez dans un ETF MSCI World pour diversifier votre portefeuille à moindre coût.", steps: ["Ouvrez un compte chez un courtier", "Investissez dans un ETF MSCI World", "Configurez des achats automatiques mensuels"] },
  { id: "f2", title: "Freelance en ligne", category: "Service", potential: "€500 - €3000/mois", difficulty: "Moyen", timeToStart: "1 semaine", description: "Monétisez vos compétences sur Malt, Upwork ou Fiverr.", steps: ["Créez votre profil professionnel", "Définissez vos services et tarifs", "Proposez vos services à votre réseau"] },
  { id: "f3", title: "Contenu YouTube/Podcast", category: "Content", potential: "€100 - €5000/mois", difficulty: "Moyen", timeToStart: "2 semaines", description: "Créez du contenu autour de votre expertise pour générer des revenus publicitaires.", steps: ["Choisissez votre niche", "Créez 10 vidéos ou épisodes", "Monétisez via AdSense et sponsors"] },
  { id: "f4", title: "Location Airbnb", category: "Real Estate", potential: "€300 - €2000/mois", difficulty: "Difficile", timeToStart: "1 mois", description: "Louez votre logement ou une chambre sur Airbnb pour générer des revenus passifs.", steps: ["Évaluez votre logement", "Créez une annonce attractive", "Gérez les réservations"] },
  { id: "f5", title: "E-commerce dropshipping", category: "Digital", potential: "€200 - €3000/mois", difficulty: "Moyen", timeToStart: "2 semaines", description: "Vendez des produits en ligne sans stock avec le dropshipping.", steps: ["Choisissez votre niche", "Créez une boutique Shopify", "Trouvez des fournisseurs"] },
  { id: "f6", title: "Formation en ligne", category: "Digital", potential: "€100 - €2000/mois", difficulty: "Moyen", timeToStart: "1 mois", description: "Vendez vos connaissances sous forme de cours en ligne sur Udemy ou Gumroad.", steps: ["Identifiez votre expertise", "Créez votre cours en vidéo", "Publiez sur Teachable ou Udemy"] },
];

const DIFF_COLORS = { Facile: "#22C55E", Moyen: "#F59E0B", Difficile: "#EF4444" };
const CAT_ICONS: Record<string, string> = { Investment: "trending-up", Digital: "monitor", "Real Estate": "home", Service: "briefcase", Content: "video", Other: "zap" };

function IdeaCard({ idea, onPress }: { idea: Idea; onPress: () => void }) {
  const colors = useColors();
  const diffColor = DIFF_COLORS[idea.difficulty] || colors.mutedForeground;
  const icon = CAT_ICONS[idea.category] || "star";

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: colors.primary + "22" }]}>
          <Feather name={icon as "star"} size={20} color={colors.primary} />
        </View>
        <View style={styles.cardBadges}>
          <View style={[styles.badge, { backgroundColor: diffColor + "22" }]}>
            <Text style={[styles.badgeText, { color: diffColor }]}>{idea.difficulty}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{idea.title}</Text>
      <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{idea.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Feather name="dollar-sign" size={13} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.foreground }]}>{idea.potential}</Text>
        </View>
        <View style={styles.footerItem}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{idea.timeToStart}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function IdeaModal({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const colors = useColors();
  const diffColor = DIFF_COLORS[idea.difficulty] || colors.mutedForeground;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHandle}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{idea.title}</Text>
              <Text style={[styles.modalCat, { color: colors.mutedForeground }]}>{idea.category}</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.modalBadges}>
            <View style={[styles.bigBadge, { backgroundColor: diffColor + "22" }]}>
              <Text style={[styles.bigBadgeText, { color: diffColor }]}>Difficulté : {idea.difficulty}</Text>
            </View>
            <View style={[styles.bigBadge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.bigBadgeText, { color: colors.primary }]}>Démarrage : {idea.timeToStart}</Text>
            </View>
          </View>

          <LinearGradient colors={["#1A2340", "#111828"]} style={styles.potentialCard}>
            <Text style={[styles.potentialLabel, { color: colors.mutedForeground }]}>Potentiel mensuel</Text>
            <Text style={[styles.potentialValue, { color: colors.primary }]}>{idea.potential}</Text>
          </LinearGradient>

          <View style={[styles.section, { marginHorizontal: 20 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
            <Text style={[styles.descText, { color: colors.mutedForeground }]}>{idea.description}</Text>
          </View>

          <View style={[styles.section, { marginHorizontal: 20 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Étapes pour démarrer</Text>
            {idea.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function IdeasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { netWorth, data, monthlyExpenses, monthlySavings } = useAppData();
  const [ideas, setIdeas] = useState<Idea[]>(FALLBACK_IDEAS);
  const [loading, setLoading] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function generateIdeas() {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${BASE_URL}/api/ai/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            netWorth,
            monthlyIncome: data.monthlyIncome,
            monthlySavings,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json() as { ideas: Idea[] };
        if (json.ideas && json.ideas.length > 0) {
          setIdeas(json.ideas);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      // keep fallback ideas
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Idées Richesse</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Générées par IA pour votre profil</Text>
        </View>
        <Pressable
          style={[styles.genBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
          onPress={generateIdeas}
          disabled={loading}
        >
          <Feather name={loading ? "loader" : "cpu"} size={16} color={loading ? colors.mutedForeground : colors.primaryForeground} />
          <Text style={[styles.genBtnText, { color: loading ? colors.mutedForeground : colors.primaryForeground }]}>
            {loading ? "..." : "Générer"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      >
        <View style={styles.grid}>
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onPress={() => setSelectedIdea(idea)} />
          ))}
        </View>
      </ScrollView>

      {selectedIdea && <IdeaModal idea={selectedIdea} onClose={() => setSelectedIdea(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  genBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  genBtnText: { fontSize: 14, fontWeight: "600" },
  grid: { gap: 14 },
  card: { borderRadius: 18, padding: 18 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  iconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardBadges: { flexDirection: "row", gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  cardFooter: { flexDirection: "row", gap: 16 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 13, fontWeight: "500" },
  modalContainer: { flex: 1 },
  modalHandle: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  modalCat: { fontSize: 14 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalBadges: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  bigBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  bigBadgeText: { fontSize: 13, fontWeight: "600" },
  potentialCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 24 },
  potentialLabel: { fontSize: 13, marginBottom: 4 },
  potentialValue: { fontSize: 28, fontWeight: "800" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  descText: { fontSize: 15, lineHeight: 22 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { fontSize: 13, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22 },
});

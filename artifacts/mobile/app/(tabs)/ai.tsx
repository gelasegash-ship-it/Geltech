import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
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
import { useColors } from "@/hooks/useColors";

const BASE_URL = process.env["EXPO_PUBLIC_DOMAIN"]
  ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`
  : "";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  suggestions?: string[];
}

interface AIPlanAction {
  id: string;
  type: "invest" | "save" | "reduce_expense" | "rebalance" | "emergency" | "transfer";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  amount: number;
  currency: string;
  target: string;
  impact: string;
  category?: string;
  goalName?: string;
}

interface AIPlan {
  planTitle: string;
  summary: string;
  healthScore: number;
  healthLabel: string;
  actions: AIPlanAction[];
  monthlySplit?: { invest: number; save: number; reserve: number; enjoy: number };
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const PRIORITY_COLORS = {
  critical: "#EF4444", high: "#F59E0B", medium: "#3B82F6", low: "#22C55E",
};
const PRIORITY_LABELS = { critical: "Urgent", high: "Prioritaire", medium: "Recommandé", low: "Optionnel" };
const TYPE_ICONS: Record<string, string> = {
  invest: "trending-up", save: "target", reduce_expense: "scissors",
  rebalance: "refresh-cw", emergency: "shield", transfer: "arrow-right",
};
const TYPE_COLORS: Record<string, string> = {
  invest: "#D4AF37", save: "#22C55E", reduce_expense: "#EF4444",
  rebalance: "#3B82F6", emergency: "#F59E0B", transfer: "#8B5CF6",
};

// ─── SpeechWave ───────────────────────────────────────────────────────────────

function SpeechWave({ active, color }: { active: boolean; color: string }) {
  const bars = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => Animated.spring(b, { toValue: 0.3, useNativeDriver: true }).start());
      return;
    }
    const delays = [0, 120, 60, 180];
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delays[i]),
          Animated.timing(b, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [active]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: 18 }}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ scaleY: b }],
          }}
        />
      ))}
    </View>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg, isSpeaking, onSpeak, onSuggestion, colors,
}: {
  msg: Message;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onSuggestion: (text: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isUser = msg.role === "user";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <LinearGradient colors={["#D4AF37", "#B8941E"]} style={styles.avatarGrad}>
            <Feather name="cpu" size={14} color="#0A0F1E" />
          </LinearGradient>
        )}
        <View style={{ flex: 1, alignItems: isUser ? "flex-end" : "flex-start" }}>
          <View style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.primary, borderBottomRightRadius: 4, maxWidth: "85%" }
              : { backgroundColor: colors.card, borderBottomLeftRadius: 4, maxWidth: "92%" },
          ]}>
            {msg.loading ? (
              <View style={styles.loadingDots}>
                <Text style={[styles.dot, { color: colors.mutedForeground }]}>●</Text>
                <Text style={[styles.dot, { color: colors.mutedForeground }]}>●</Text>
                <Text style={[styles.dot, { color: colors.mutedForeground }]}>●</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.bubbleText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
                  {msg.content}
                </Text>
                {!isUser && msg.content.length > 0 && (
                  <Pressable
                    style={styles.speakBtn}
                    onPress={() => onSpeak(msg.content)}
                  >
                    {isSpeaking
                      ? <SpeechWave active color={colors.primary} />
                      : <Feather name="volume-2" size={13} color={colors.mutedForeground} />
                    }
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Suggestions */}
          {!isUser && !msg.loading && msg.suggestions && msg.suggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 6 }}
              contentContainerStyle={{ gap: 6 }}
            >
              {msg.suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
                  onPress={() => onSuggestion(s)}
                >
                  <Feather name="corner-down-right" size={10} color={colors.primary} />
                  <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── PlanActionCard ───────────────────────────────────────────────────────────

function PlanActionCard({
  action, onApply, applied, colors,
}: {
  action: AIPlanAction;
  onApply: () => void;
  applied: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const pColor = PRIORITY_COLORS[action.priority];
  const tColor = TYPE_COLORS[action.type] || colors.primary;
  const icon = TYPE_ICONS[action.type] || "zap";

  return (
    <View style={[styles.actionCard, { backgroundColor: colors.card }, applied && { opacity: 0.55 }]}>
      <View style={styles.actionTop}>
        <View style={[styles.actionIconBg, { backgroundColor: tColor + "22" }]}>
          <Feather name={icon as "target"} size={20} color={tColor} />
        </View>
        <View style={styles.actionInfo}>
          <View style={styles.actionTitleRow}>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>{action.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: pColor + "22" }]}>
              <Text style={[styles.priorityText, { color: pColor }]}>{PRIORITY_LABELS[action.priority]}</Text>
            </View>
          </View>
          <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>{action.description}</Text>
        </View>
      </View>
      <View style={[styles.actionFooter, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.actionAmount, { color: tColor }]}>
            {action.amount.toLocaleString("fr-FR", { style: "currency", currency: action.currency || "EUR", maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.actionImpact, { color: colors.mutedForeground }]}>{action.impact}</Text>
        </View>
        <Pressable
          style={[styles.applyBtn, { backgroundColor: applied ? colors.muted : tColor }]}
          onPress={onApply}
          disabled={applied}
        >
          <Feather name={applied ? "check" : "zap"} size={14} color={applied ? colors.mutedForeground : "#fff"} />
          <Text style={[styles.applyBtnText, { color: applied ? colors.mutedForeground : "#fff" }]}>
            {applied ? "Appliqué" : "Appliquer"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AIAdvisorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data, netWorth, monthlyExpenses, monthlySavings, totalGains, totalInvested,
    totalBankBalance, addTransaction, updateSavingsGoal,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<"chat" | "pilot">("chat");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: `Bonjour ! Je suis WealthAI, votre conseiller financier d'élite.\n\n💰 Patrimoine : ${netWorth.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}\n\nPosez-moi n'importe quelle question financière — je vous réponds en temps réel, par texte ou à voix haute. 🔊`,
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Speech state
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // Turbo mode — ultra short replies
  const [turboMode, setTurboMode] = useState(false);

  // Pilot state
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const gainPct = totalInvested > 0 ? ((totalGains / totalInvested) * 100).toFixed(1) : "0";

  // Stop speech on unmount
  useEffect(() => { return () => { Speech.stop(); }; }, []);

  // ── Speech ──────────────────────────────────────────────────────────────────

  function handleSpeak(msgId: string, text: string) {
    if (speakingMsgId === msgId) {
      Speech.stop();
      setSpeakingMsgId(null);
      return;
    }
    Speech.stop();
    setSpeakingMsgId(msgId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.speak(text, {
      language: "fr-FR",
      rate: 1.05,
      pitch: 1.0,
      onDone: () => setSpeakingMsgId(null),
      onStopped: () => setSpeakingMsgId(null),
      onError: () => setSpeakingMsgId(null),
    });
  }

  // ── Fetch suggestions ────────────────────────────────────────────────────────

  async function fetchSuggestions(msgId: string, userQ: string, aiReply: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/ai/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastUserMsg: userQ, lastAIMsg: aiReply }),
      });
      if (!res.ok) return;
      const json = await res.json() as { suggestions?: string[] };
      if (json.suggestions?.length) {
        setMessages((prev) =>
          prev.map((m) => m.id === msgId ? { ...m, suggestions: json.suggestions } : m)
        );
      }
    } catch { /* silent */ }
  }

  // ── System context ───────────────────────────────────────────────────────────

  const systemContext = `You are WealthAI, an elite French-language financial advisor AI (GPT-5.4).
User profile: Net worth €${netWorth.toLocaleString()}, Monthly income €${data.monthlyIncome.toLocaleString()}, 
Monthly savings €${monthlySavings.toLocaleString()}/month, 
Portfolio: ${data.investments.map((i) => `${i.symbol}(${(((i.currentPrice - i.buyPrice) / i.buyPrice) * 100).toFixed(1)}%)`).join(", ")},
Bank accounts: ${data.bankAccounts.length} comptes, total €${totalBankBalance.toLocaleString()}.
Always respond in French. Be specific, concise, and actionable. Use emojis sparingly.`;

  // ── Quick prompts ─────────────────────────────────────────────────────────────

  const quickPrompts = [
    `Mon portefeuille est à +${gainPct}%. Comment optimiser ?`,
    `J'épargne ${monthlySavings.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}/mois. Que faire ?`,
    "Quelle allocation d'actifs recommandez-vous ?",
    "Expliquez le Dollar Cost Averaging",
  ];

  // ── Send message ─────────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    if (!text.trim() || chatLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: genId(), role: "user", content: text.trim() };
    const loadingId = genId();
    const loadingMsg: Message = { id: loadingId, role: "assistant", content: "", loading: true };
    const updated = [...messages.filter((m) => !m.loading), userMsg];
    setMessages([...updated, loadingMsg]);
    setInput("");
    setChatLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: systemContext,
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          turbo: turboMode,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        setMessages((prev) => prev.map((m) =>
          m.id === loadingId ? { ...m, loading: false, content: err.message || "Erreur IA." } : m
        ));
        setChatLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => prev.map((m) =>
                  m.id === loadingId ? { ...m, loading: false, content: fullContent } : m
                ));
                setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 30);
              }
            } catch { /* skip */ }
          }
        }
      }

      // Auto-speak the response
      if (autoSpeak && fullContent) {
        setSpeakingMsgId(loadingId);
        Speech.speak(fullContent, {
          language: "fr-FR",
          rate: 1.05,
          onDone: () => setSpeakingMsgId(null),
          onStopped: () => setSpeakingMsgId(null),
          onError: () => setSpeakingMsgId(null),
        });
      }

      // Fetch follow-up suggestions
      fetchSuggestions(loadingId, text.trim(), fullContent);

    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === loadingId ? { ...m, loading: false, content: "Impossible de joindre le serveur IA." } : m
      ));
    } finally {
      setChatLoading(false);
    }
  }

  // ── Generate plan ─────────────────────────────────────────────────────────────

  async function generatePlan() {
    setPlanLoading(true);
    setAppliedActions(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${BASE_URL}/api/ai/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialData: {
            netWorth, monthlyIncome: data.monthlyIncome, monthlyExpenses, monthlySavings, totalBankBalance,
            investments: data.investments.map((i) => ({
              symbol: i.symbol, name: i.name,
              value: i.currentPrice * i.quantity,
              gainPercent: (((i.currentPrice - i.buyPrice) / i.buyPrice) * 100),
              category: i.category,
            })),
            bankAccounts: data.bankAccounts.map((a) => ({
              bankName: a.bankName, accountType: a.accountType, balance: a.balance, currency: a.currency,
            })),
            savingsGoals: data.savingsGoals.map((g) => ({
              name: g.name, target: g.target, current: g.current,
              progressPct: Math.round((g.current / g.target) * 100),
            })),
          },
        }),
      });
      if (res.ok) {
        const json = await res.json() as AIPlan;
        setPlan(json);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (autoSpeak && json.summary) {
          Speech.speak(json.summary, { language: "fr-FR", rate: 1.05 });
        }
      }
    } catch {
      Alert.alert("Erreur", "Impossible de générer le plan. Vérifiez votre connexion.");
    } finally {
      setPlanLoading(false);
    }
  }

  // ── Apply plan action ─────────────────────────────────────────────────────────

  function applyAction(action: AIPlanAction) {
    Alert.alert(
      `Appliquer : ${action.title}`,
      `${action.description}\n\nMontant : ${action.amount.toLocaleString("fr-FR", { style: "currency", currency: action.currency || "EUR" })}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            if (action.type === "reduce_expense") {
              addTransaction({ type: "expense", category: action.category || "Autre", description: `[IA] ${action.title}`, amount: action.amount, date: new Date().toISOString() });
            } else if ((action.type === "save" || action.type === "emergency") && action.goalName) {
              const goal = data.savingsGoals.find((g) => g.name.toLowerCase().includes((action.goalName || "").toLowerCase()));
              if (goal) updateSavingsGoal(goal.id, goal.current + action.amount);
              else addTransaction({ type: "expense", category: "Épargne", description: `[IA] ${action.title}`, amount: action.amount, date: new Date().toISOString() });
            } else {
              addTransaction({ type: "expense", category: action.type === "invest" ? "Investissement" : "Épargne", description: `[IA] ${action.title} — ${action.target}`, amount: action.amount, date: new Date().toISOString() });
            }
            setAppliedActions((prev) => new Set([...prev, action.id]));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  const healthColor = (plan?.healthScore ?? 0) >= 70 ? colors.success : (plan?.healthScore ?? 0) >= 50 ? colors.warning : colors.destructive;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={["#D4AF37", "#B8941E"]} style={styles.headerIcon}>
            <Feather name="cpu" size={18} color="#0A0F1E" />
          </LinearGradient>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>WealthAI</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>GPT-5.4 · En ligne</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          {/* Turbo toggle */}
          <Pressable
            style={[styles.toggleBtn, { backgroundColor: turboMode ? "#F59E0B22" : colors.muted, borderColor: turboMode ? "#F59E0B" : "transparent", borderWidth: 1 }]}
            onPress={() => { setTurboMode((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Feather name="zap" size={13} color={turboMode ? "#F59E0B" : colors.mutedForeground} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: turboMode ? "#F59E0B" : colors.mutedForeground }}>Turbo</Text>
          </Pressable>
          {/* AutoSpeak toggle */}
          <Pressable
            style={[styles.toggleBtn, { backgroundColor: autoSpeak ? colors.primary + "22" : colors.muted, borderColor: autoSpeak ? colors.primary : "transparent", borderWidth: 1 }]}
            onPress={() => {
              const next = !autoSpeak;
              setAutoSpeak(next);
              if (!next) { Speech.stop(); setSpeakingMsgId(null); }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather name={autoSpeak ? "volume-2" : "volume-x"} size={13} color={autoSpeak ? colors.primary : colors.mutedForeground} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: autoSpeak ? colors.primary : colors.mutedForeground }}>Voix</Text>
          </Pressable>
          {/* Tab switcher */}
          <View style={[styles.tabSwitch, { backgroundColor: colors.muted }]}>
            <Pressable
              style={[styles.tabSwitchBtn, activeTab === "chat" && { backgroundColor: colors.card }]}
              onPress={() => setActiveTab("chat")}
            >
              <Feather name="message-circle" size={13} color={activeTab === "chat" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabSwitchText, { color: activeTab === "chat" ? colors.primary : colors.mutedForeground }]}>Chat</Text>
            </Pressable>
            <Pressable
              style={[styles.tabSwitchBtn, activeTab === "pilot" && { backgroundColor: colors.card }]}
              onPress={() => setActiveTab("pilot")}
            >
              <Feather name="zap" size={13} color={activeTab === "pilot" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabSwitchText, { color: activeTab === "pilot" ? colors.primary : colors.mutedForeground }]}>Pilote</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Turbo / AutoSpeak banner ── */}
      {(turboMode || autoSpeak) && (
        <View style={[styles.modeBanner, { backgroundColor: colors.card }]}>
          {turboMode && (
            <View style={styles.modePill}>
              <Feather name="zap" size={11} color="#F59E0B" />
              <Text style={{ fontSize: 11, color: "#F59E0B", fontWeight: "700" }}>Mode Turbo · Réponses ultra-rapides</Text>
            </View>
          )}
          {autoSpeak && (
            <View style={styles.modePill}>
              <Feather name="volume-2" size={11} color={colors.primary} />
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "700" }}>Lecture automatique activée</Text>
              {speakingMsgId && <SpeechWave active color={colors.primary} />}
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════ CHAT TAB */}
      {activeTab === "chat" && (
        <>
          {messages.length <= 1 && (
            <View style={[styles.ctxBanner, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "22" }]}>
              <Feather name="zap" size={12} color={colors.primary} />
              <Text style={[styles.ctxText, { color: colors.primary }]}>
                Contexte chargé · {data.investments.length} actifs · {data.bankAccounts.length} compte{data.bankAccounts.length !== 1 ? "s" : ""} · {netWorth.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </Text>
            </View>
          )}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                isSpeaking={speakingMsgId === item.id}
                onSpeak={(text) => handleSpeak(item.id, text)}
                onSuggestion={(text) => sendMessage(text)}
                colors={colors}
              />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
          {messages.length <= 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {quickPrompts.map((p) => (
                <Pressable key={p} style={[styles.quickChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => sendMessage(p)}>
                  <Text style={[styles.quickText, { color: colors.foreground }]}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(bottomPad, 12) + 8 }]}>
            <TextInput
              value={input} onChangeText={setInput}
              placeholder={turboMode ? "Question courte (Turbo)…" : "Posez votre question financière…"}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              multiline maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={() => { if (!chatLoading) sendMessage(input); }}
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendBtn, { backgroundColor: input.trim() && !chatLoading ? (turboMode ? "#F59E0B" : colors.primary) : colors.muted }]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || chatLoading}
            >
              <Feather name={chatLoading ? "loader" : "send"} size={17}
                color={input.trim() && !chatLoading ? colors.primaryForeground : colors.mutedForeground} />
            </Pressable>
          </View>
        </>
      )}

      {/* ══════════════════════════════════════════ PILOTE AUTO TAB */}
      {activeTab === "pilot" && (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(bottomPad, 20) + 80 }}>
          <LinearGradient colors={["#1A2340", "#0D1526"]} style={styles.pilotHero}>
            <View style={styles.pilotHeroTop}>
              <View>
                <Text style={[styles.pilotTitle, { color: colors.foreground }]}>Pilote Automatique IA</Text>
                <Text style={[styles.pilotSub, { color: colors.mutedForeground }]}>
                  L'IA analyse votre patrimoine et crée un plan d'actions exécutables
                </Text>
              </View>
              <LinearGradient colors={["#D4AF37", "#B8941E"]} style={styles.pilotIcon}>
                <Feather name="zap" size={22} color="#0A0F1E" />
              </LinearGradient>
            </View>
            <View style={styles.snapshotRow}>
              {[
                { label: "Patrimoine", value: netWorth.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), color: colors.primary },
                { label: "Épargne/mois", value: monthlySavings.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), color: colors.success },
                { label: "Comptes", value: `${data.bankAccounts.length + data.savingsGoals.length}`, color: colors.foreground },
              ].map((s) => (
                <View key={s.label} style={styles.snapshotItem}>
                  <Text style={[styles.snapshotVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.snapshotLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={[styles.generateBtn, { backgroundColor: planLoading ? colors.muted : colors.primary }]}
              onPress={generatePlan} disabled={planLoading}
            >
              <Feather name={planLoading ? "loader" : "cpu"} size={18} color={planLoading ? colors.mutedForeground : "#0A0F1E"} />
              <Text style={[styles.generateBtnText, { color: planLoading ? colors.mutedForeground : "#0A0F1E" }]}>
                {planLoading ? "Analyse en cours…" : plan ? "Regénérer le plan" : "Générer mon plan IA"}
              </Text>
            </Pressable>
          </LinearGradient>

          {plan && (
            <>
              <View style={[styles.healthCard, { backgroundColor: colors.card }]}>
                <View style={styles.healthRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.healthTitle, { color: colors.foreground }]}>{plan.planTitle}</Text>
                    <Text style={[styles.healthSummary, { color: colors.mutedForeground }]}>{plan.summary}</Text>
                    <Pressable
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}
                      onPress={() => Speech.speak(plan.summary, { language: "fr-FR", rate: 1.05 })}
                    >
                      <Feather name="volume-2" size={13} color={colors.primary} />
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>Écouter le résumé</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.healthScore, { backgroundColor: healthColor + "22", borderColor: healthColor + "44" }]}>
                    <Text style={[styles.healthScoreNum, { color: healthColor }]}>{plan.healthScore}</Text>
                    <Text style={[styles.healthScoreLabel, { color: healthColor }]}>{plan.healthLabel}</Text>
                  </View>
                </View>
                {plan.monthlySplit && (
                  <View style={styles.splitSection}>
                    <Text style={[styles.splitTitle, { color: colors.mutedForeground }]}>Répartition recommandée</Text>
                    <View style={styles.splitBar}>
                      {[
                        { key: "invest", color: colors.primary },
                        { key: "save", color: colors.success },
                        { key: "reserve", color: "#3B82F6" },
                        { key: "enjoy", color: "#8B5CF6" },
                      ].map((s) => {
                        const pct = plan.monthlySplit![s.key as keyof typeof plan.monthlySplit] ?? 0;
                        return <View key={s.key} style={[styles.splitSegment, { flex: pct, backgroundColor: s.color }]} />;
                      })}
                    </View>
                    <View style={styles.splitLegend}>
                      {[
                        { key: "invest", color: colors.primary, label: "Invest." },
                        { key: "save", color: colors.success, label: "Épargne" },
                        { key: "reserve", color: "#3B82F6", label: "Réserve" },
                        { key: "enjoy", color: "#8B5CF6", label: "Plaisir" },
                      ].map((s) => (
                        <View key={s.key} style={styles.splitLegendItem}>
                          <View style={[styles.splitDot, { backgroundColor: s.color }]} />
                          <Text style={[styles.splitLegendText, { color: colors.mutedForeground }]}>{s.label} {plan.monthlySplit![s.key as keyof typeof plan.monthlySplit] ?? 0}%</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.actionsSection}>
                <View style={styles.actionsSectionHeader}>
                  <Text style={[styles.actionsSectionTitle, { color: colors.foreground }]}>Actions à exécuter</Text>
                  <View style={[styles.actionCount, { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.actionCountText, { color: colors.primary }]}>{appliedActions.size}/{plan.actions.length}</Text>
                  </View>
                </View>
                {plan.actions.map((action) => (
                  <PlanActionCard key={action.id} action={action} applied={appliedActions.has(action.id)} onApply={() => applyAction(action)} colors={colors} />
                ))}
                {appliedActions.size === plan.actions.length && plan.actions.length > 0 && (
                  <LinearGradient colors={["#22C55E22", "#22C55E11"]} style={[styles.allDoneCard, { borderColor: "#22C55E33" }]}>
                    <Feather name="check-circle" size={32} color="#22C55E" />
                    <Text style={[styles.allDoneTitle, { color: "#22C55E" }]}>Plan entièrement exécuté !</Text>
                    <Text style={[styles.allDoneSub, { color: colors.mutedForeground }]}>
                      Toutes les actions ont été appliquées. Régénérez un nouveau plan le mois prochain.
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </>
          )}

          {!plan && !planLoading && (
            <View style={styles.emptyPilot}>
              <Feather name="zap" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyPilotTitle, { color: colors.foreground }]}>Plan IA non généré</Text>
              <Text style={[styles.emptyPilotSub, { color: colors.mutedForeground }]}>
                Appuyez sur "Générer mon plan IA" pour que l'IA analyse votre argent et crée un plan d'action personnalisé.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  tabSwitch: { flexDirection: "row", borderRadius: 22, padding: 3, gap: 2 },
  tabSwitchBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 19 },
  tabSwitchText: { fontSize: 12, fontWeight: "600" },
  modeBanner: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  modePill: { flexDirection: "row", alignItems: "center", gap: 5 },
  ctxBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  ctxText: { fontSize: 12, fontWeight: "500", flex: 1 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  avatarGrad: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  speakBtn: { marginTop: 6, alignSelf: "flex-end" },
  suggestionChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  suggestionText: { fontSize: 12 },
  loadingDots: { flexDirection: "row", gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  dot: { fontSize: 9 },
  quickScroll: { flexGrow: 0, marginBottom: 4 },
  quickChip: { borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, maxWidth: 240 },
  quickText: { fontSize: 13, lineHeight: 18 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 12, gap: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, maxHeight: 110, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pilotHero: { margin: 16, borderRadius: 22, padding: 22 },
  pilotHeroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  pilotTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  pilotSub: { fontSize: 13, lineHeight: 18, maxWidth: 220 },
  pilotIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  snapshotRow: { flexDirection: "row", gap: 0, marginBottom: 20 },
  snapshotItem: { flex: 1, alignItems: "center" },
  snapshotVal: { fontSize: 15, fontWeight: "800", marginBottom: 3 },
  snapshotLabel: { fontSize: 10 },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, borderRadius: 16 },
  generateBtnText: { fontSize: 16, fontWeight: "700" },
  healthCard: { marginHorizontal: 16, borderRadius: 18, padding: 18, marginBottom: 16 },
  healthRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  healthTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  healthSummary: { fontSize: 13, lineHeight: 19 },
  healthScore: { alignItems: "center", justifyContent: "center", width: 68, height: 68, borderRadius: 34, borderWidth: 2, flexShrink: 0 },
  healthScoreNum: { fontSize: 22, fontWeight: "800" },
  healthScoreLabel: { fontSize: 10, fontWeight: "600" },
  splitSection: { borderTopWidth: 1, borderTopColor: "#1E2A46", paddingTop: 14 },
  splitTitle: { fontSize: 12, marginBottom: 10 },
  splitBar: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 },
  splitSegment: { borderRadius: 5 },
  splitLegend: { flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap" },
  splitLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitLegendText: { fontSize: 11 },
  actionsSection: { paddingHorizontal: 16 },
  actionsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  actionsSectionTitle: { fontSize: 16, fontWeight: "700" },
  actionCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  actionCountText: { fontSize: 12, fontWeight: "700" },
  actionCard: { borderRadius: 18, padding: 16, marginBottom: 12 },
  actionTop: { flexDirection: "row", gap: 14, marginBottom: 12 },
  actionIconBg: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionInfo: { flex: 1 },
  actionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" },
  actionTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 10, fontWeight: "700" },
  actionDesc: { fontSize: 13, lineHeight: 18 },
  actionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12 },
  actionAmount: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  actionImpact: { fontSize: 11 },
  applyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14 },
  applyBtnText: { fontSize: 13, fontWeight: "700" },
  allDoneCard: { borderRadius: 18, padding: 24, alignItems: "center", gap: 10, borderWidth: 1, marginBottom: 20, marginTop: 8 },
  allDoneTitle: { fontSize: 17, fontWeight: "800" },
  allDoneSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  emptyPilot: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32, gap: 12 },
  emptyPilotTitle: { fontSize: 17, fontWeight: "700" },
  emptyPilotSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});

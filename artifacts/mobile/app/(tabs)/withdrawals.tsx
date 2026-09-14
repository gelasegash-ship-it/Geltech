import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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

import { Withdrawal, useAppData } from "@/contexts/AppDataContext";
import QRScanner, { detectQRType } from "@/components/QRScanner";
import { useWithdrawalTracker } from "@/hooks/useWithdrawalTracker";
import { useColors } from "@/hooks/useColors";
import { CURRENCIES, useExchangeRates } from "@/hooks/useExchangeRates";

// ─── Destination types ───────────────────────────────────────────────────────

const MOBILE_MONEY_OPERATORS = [
  { id: "orange_money",  label: "Orange Money",  emoji: "🟠", countries: "CI, SN, CM, BF, ML, GN" },
  { id: "wave",          label: "Wave",           emoji: "🌊", countries: "SN, CI, BF, ML, UG" },
  { id: "mtn_momo",     label: "MTN MoMo",       emoji: "🟡", countries: "CM, GH, RW, UG, ZA" },
  { id: "airtel_money", label: "Airtel Money",   emoji: "🔴", countries: "TZ, ZM, MW, RW, UG" },
  { id: "m_pesa",       label: "M-Pesa",         emoji: "🟢", countries: "KE, TZ, MZ, EG" },
  { id: "moov_money",   label: "Moov Money",     emoji: "🔵", countries: "BJ, BF, CI, GA, TG" },
  { id: "free_money",   label: "Free Money",     emoji: "🟣", countries: "SN" },
  { id: "yas",          label: "YAS Money",      emoji: "⚡", countries: "CM" },
  { id: "flooz",        label: "Flooz",          emoji: "💜", countries: "BJ, TG" },
];

const DEST_CATEGORIES = [
  {
    id: "my_accounts",
    label: "Mes comptes bancaires",
    icon: "credit-card",
    color: "#D4AF37",
    desc: "Virer vers un compte enregistré",
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    icon: "smartphone",
    color: "#22C55E",
    desc: "Orange, Wave, MTN, M-Pesa…",
  },
  {
    id: "bank_transfer",
    label: "Virement bancaire",
    icon: "home",
    color: "#3B82F6",
    desc: "IBAN/RIB · banque extérieure",
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: "send",
    color: "#003087",
    desc: "Via email PayPal",
  },
  {
    id: "wise",
    label: "Wise (TransferWise)",
    icon: "globe",
    color: "#9FE870",
    desc: "Transfert international",
  },
  {
    id: "revolut",
    label: "Revolut",
    icon: "zap",
    color: "#7C3AED",
    desc: "Via tag ou numéro",
  },
  {
    id: "crypto",
    label: "Portefeuille Crypto",
    icon: "cpu",
    color: "#F59E0B",
    desc: "Bitcoin, Ethereum, USDT…",
  },
  {
    id: "cash",
    label: "Espèces",
    icon: "dollar-sign",
    color: "#6B7280",
    desc: "Retrait physique",
  },
];

const CRYPTO_NETWORKS = ["Bitcoin (BTC)", "Ethereum (ERC-20)", "BNB Chain (BEP-20)", "Tron (TRC-20)", "Solana", "Polygon"];

// ─── Withdrawal method display ───────────────────────────────────────────────

const WITHDRAWAL_METHODS = [
  { id: "bank",         label: "Virement bancaire",   icon: "home" },
  { id: "mobile",       label: "Mobile Money",        icon: "smartphone" },
  { id: "cash",         label: "Espèces",             icon: "dollar-sign" },
  { id: "crypto_wallet",label: "Portefeuille Crypto", icon: "cpu" },
  { id: "paypal",       label: "PayPal",              icon: "send" },
  { id: "card",         label: "Carte bancaire",      icon: "credit-card" },
  { id: "wise",         label: "Wise",                icon: "globe" },
  { id: "revolut",      label: "Revolut",             icon: "zap" },
];

const STATUS_COLORS: Record<string, string> = {
  completed:  "#22C55E",
  pending:    "#F59E0B",
  processing: "#3B82F6",
  failed:     "#EF4444",
  cancelled:  "#6B7280",
};
const STATUS_LABELS: Record<string, string> = {
  completed:  "Effectué",
  pending:    "En attente",
  processing: "En traitement",
  failed:     "Échoué",
  cancelled:  "Annulé",
};

// ─── CurrencyPicker ──────────────────────────────────────────────────────────

function CurrencyPicker({ selected, onSelect, colors }: {
  selected: string;
  onSelect: (code: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [open, setOpen] = useState(false);
  const currency = CURRENCIES.find((c) => c.code === selected);

  return (
    <>
      <Pressable
        style={[styles.currencyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.currencyFlag}>{currency?.flag}</Text>
        <Text style={[styles.currencyCode, { color: colors.foreground }]}>{selected}</Text>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Choisir une devise</Text>
            <Pressable onPress={() => setOpen(false)}><Feather name="x" size={24} color={colors.mutedForeground} /></Pressable>
          </View>
          <FlatList
            data={CURRENCIES}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.currencyRow, { borderBottomColor: colors.border }, selected === item.code && { backgroundColor: colors.primary + "22" }]}
                onPress={() => { onSelect(item.code); setOpen(false); }}
              >
                <Text style={styles.currencyRowFlag}>{item.flag}</Text>
                <View style={styles.currencyRowInfo}>
                  <Text style={[styles.currencyRowCode, { color: colors.foreground }]}>{item.code}</Text>
                  <Text style={[styles.currencyRowName, { color: colors.mutedForeground }]}>{item.name}</Text>
                </View>
                <Text style={[styles.currencyRowSymbol, { color: colors.mutedForeground }]}>{item.symbol}</Text>
                {selected === item.code && <Feather name="check" size={16} color={colors.primary} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

// ─── LiveProgressBar ─────────────────────────────────────────────────────────

const PENDING_MS    = 12000;
const PROCESSING_MS = 45000;

function LiveProgressBar({ w, color }: { w: Withdrawal; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const created = new Date(w.date).getTime();

      if (w.status === "pending") {
        const elapsed = Math.min(now - created, PENDING_MS);
        setPct(elapsed / PENDING_MS);
      } else if (w.status === "processing") {
        const start = w.processingStartedAt
          ? new Date(w.processingStartedAt).getTime()
          : created + PENDING_MS;
        const elapsed = Math.min(now - start, PROCESSING_MS);
        setPct(elapsed / PROCESSING_MS);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [w.status, w.date, w.processingStartedAt]);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const remainingSec = () => {
    const now = Date.now();
    if (w.status === "pending") {
      const created = new Date(w.date).getTime();
      return Math.max(0, Math.ceil((PENDING_MS - (now - created)) / 1000));
    }
    if (w.status === "processing") {
      const start = w.processingStartedAt
        ? new Date(w.processingStartedAt).getTime()
        : new Date(w.date).getTime() + PENDING_MS;
      return Math.max(0, Math.ceil((PROCESSING_MS - (now - start)) / 1000));
    }
    return 0;
  };

  const [remaining, setRemaining] = useState(remainingSec());
  useEffect(() => {
    const id = setInterval(() => setRemaining(remainingSec()), 1000);
    return () => clearInterval(id);
  }, [w.status, w.date, w.processingStartedAt]);

  const label =
    w.status === "pending"
      ? `Démarrage dans ${remaining}s…`
      : `Finalisation dans ${remaining}s…`;

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ color, fontSize: 11, fontWeight: "600" }}>
          {w.status === "pending" ? "⏳ En file d'attente" : "⚡ Traitement en cours"}
        </Text>
        <Text style={{ color, fontSize: 11 }}>{label}</Text>
      </View>
      <View style={{ height: 5, borderRadius: 4, backgroundColor: color + "30", overflow: "hidden" }}>
        <Animated.View
          style={{
            height: 5,
            borderRadius: 4,
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }}
        />
      </View>
    </View>
  );
}

// ─── PulseDot ────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, transform: [{ scale }], opacity, marginRight: 6 }}
    />
  );
}

// ─── WithdrawalCard ──────────────────────────────────────────────────────────

function WithdrawalCard({ w, onDelete }: { w: Withdrawal; onDelete: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[w.status] ?? "#6B7280";
  const date = new Date(w.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const fromCurrency = CURRENCIES.find((c) => c.code === w.currency);
  const toCurrency = CURRENCIES.find((c) => c.code === w.toCurrency);
  const method = WITHDRAWAL_METHODS.find((m) => m.id === w.method);
  const destCat = DEST_CATEGORIES.find((d) => d.id === w.method) ?? method;
  const iconName = (destCat as typeof DEST_CATEGORIES[0])?.icon ?? "arrow-up-right";
  const iconColor = (destCat as typeof DEST_CATEGORIES[0])?.color ?? statusColor;
  const isLive = w.status === "pending" || w.status === "processing";

  return (
    <View style={[styles.wCard, { backgroundColor: colors.card, borderWidth: isLive ? 1 : 0, borderColor: statusColor + "50" }]}>
      <View style={styles.wCardTop}>
        <View style={[styles.wIconBg, { backgroundColor: iconColor + "22" }]}>
          <Feather name={iconName as "send"} size={20} color={iconColor} />
        </View>
        <View style={styles.wCardInfo}>
          <Text style={[styles.wCardSource, { color: colors.foreground }]} numberOfLines={1}>{w.sourceName}</Text>
          <Text style={[styles.wCardMethod, { color: colors.mutedForeground }]} numberOfLines={1}>
            → {w.note ? `${w.note} · ` : ""}{method?.label ?? w.method} · {date}
          </Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <View style={[styles.wCardDivider, { backgroundColor: colors.border }]} />
      <View style={styles.wCardBottom}>
        <View>
          <Text style={[styles.wAmountLabel, { color: colors.mutedForeground }]}>Montant</Text>
          <Text style={[styles.wAmount, { color: colors.foreground }]}>
            {w.amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {fromCurrency?.symbol ?? w.currency}
          </Text>
        </View>
        {w.currency !== w.toCurrency && (
          <>
            <View style={styles.wArrow}><Feather name="arrow-right" size={16} color={colors.mutedForeground} /></View>
            <View>
              <Text style={[styles.wAmountLabel, { color: colors.mutedForeground }]}>Reçu</Text>
              <Text style={[styles.wAmountConverted, { color: colors.primary }]}>
                {w.amountConverted.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {toCurrency?.symbol ?? w.toCurrency}
              </Text>
            </View>
          </>
        )}
        <View style={[styles.wStatus, { backgroundColor: statusColor + "22", flexDirection: "row", alignItems: "center" }]}>
          {isLive && <PulseDot color={statusColor} />}
          <Text style={[styles.wStatusText, { color: statusColor }]}>{STATUS_LABELS[w.status] ?? w.status}</Text>
        </View>
      </View>
      {isLive && <LiveProgressBar w={w} color={statusColor} />}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type Step = "source" | "destination" | "dest_detail" | "amount";
type DestCategory = typeof DEST_CATEGORIES[0];

export default function WithdrawalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, addWithdrawal, removeWithdrawal, totalWithdrawn } = useAppData();
  const { convert, rates, loading: ratesLoading, lastUpdated, refresh } = useExchangeRates("EUR");
  useWithdrawalTracker();

  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState<Step>("source");

  // Step 1 – Source
  const [selectedSource, setSelectedSource] = useState<{
    type: "investment" | "savings" | "budget" | "account";
    id: string;
    name: string;
    available: number;
    currency: string;
    icon: string;
    color: string;
  } | null>(null);

  // Step 2 – Destination category
  const [destCategory, setDestCategory] = useState<DestCategory | null>(null);

  // Step 3 – Destination detail (filled depending on category)
  const [destAccountId, setDestAccountId] = useState<string | null>(null); // my_accounts
  const [mobileOperator, setMobileOperator] = useState(MOBILE_MONEY_OPERATORS[0]);
  const [mobilePhone, setMobilePhone] = useState("");
  const [mobileRecipient, setMobileRecipient] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankBeneficiary, setBankBeneficiary] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [wiseEmail, setWiseEmail] = useState("");
  const [revolutTag, setRevolutTag] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState(CRYPTO_NETWORKS[0]);

  // Step 4 – Amount
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("EUR");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [note, setNote] = useState("");

  // QR Scanner
  const [showQR, setShowQR] = useState(false);
  type QRTarget = "phone" | "iban" | "crypto" | "paypal" | "wise" | "revolut";
  const [qrTarget, setQrTarget] = useState<QRTarget>("crypto");

  function openQR(target: QRTarget) {
    setQrTarget(target);
    setShowQR(true);
  }

  function handleQRScan(data: string) {
    const type = detectQRType(data);
    // Strip URI prefixes (bitcoin:addr?amount=..., ethereum:addr)
    let clean = data;
    const uriMatch = data.match(/^[a-z]+:([^?]+)/i);
    if (uriMatch) clean = uriMatch[1];

    switch (qrTarget) {
      case "phone":     setMobilePhone(clean); break;
      case "iban":      setBankIban(clean.replace(/\s/g, "").toUpperCase()); break;
      case "crypto":    setCryptoAddress(clean); break;
      case "paypal":    setPaypalEmail(clean); break;
      case "wise":      setWiseEmail(clean); break;
      case "revolut":   setRevolutTag(clean); break;
    }
    // Auto-detect crypto network from address format
    if (qrTarget === "crypto") {
      if (/^(bc1|[13])/.test(clean)) setCryptoNetwork("Bitcoin (BTC)");
      else if (/^0x/.test(clean)) setCryptoNetwork("Ethereum (ERC-20)");
      else if (/^T/.test(clean)) setCryptoNetwork("Tron (TRC-20)");
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const convertedAmount = amount ? convert(parseFloat(amount) || 0, fromCurrency, toCurrency) : 0;

  // Sources = investments + savings goals + bank accounts + budget
  const sources = [
    ...data.bankAccounts.map((a) => ({
      type: "account" as const,
      id: a.id,
      name: `${a.bankName}${a.lastFourDigits ? ` ****${a.lastFourDigits}` : ""}`,
      available: a.balance,
      currency: a.currency,
      icon: "credit-card",
      color: a.color,
    })),
    ...data.investments.map((inv) => ({
      type: "investment" as const,
      id: inv.id,
      name: `${inv.name} (${inv.symbol})`,
      available: inv.currentPrice * inv.quantity,
      currency: "USD",
      icon: "trending-up",
      color: "#3B82F6",
    })),
    ...data.savingsGoals.map((g) => ({
      type: "savings" as const,
      id: g.id,
      name: g.name,
      available: g.current,
      currency: "EUR",
      icon: "target",
      color: "#22C55E",
    })),
    {
      type: "budget" as const,
      id: "budget",
      name: "Budget mensuel",
      available: data.monthlyIncome,
      currency: "EUR",
      icon: "pie-chart",
      color: "#D4AF37",
    },
  ];

  function buildDestLabel(): string {
    if (!destCategory) return "";
    if (destCategory.id === "my_accounts") {
      const acc = data.bankAccounts.find((a) => a.id === destAccountId);
      return acc ? `${acc.bankName}${acc.lastFourDigits ? ` ****${acc.lastFourDigits}` : ""}` : destCategory.label;
    }
    if (destCategory.id === "mobile_money") return `${mobileOperator.label}${mobilePhone ? ` · ${mobilePhone}` : ""}`;
    if (destCategory.id === "bank_transfer") return bankBeneficiary || "Virement bancaire";
    if (destCategory.id === "paypal") return paypalEmail || "PayPal";
    if (destCategory.id === "wise") return wiseEmail || "Wise";
    if (destCategory.id === "revolut") return revolutTag || "Revolut";
    if (destCategory.id === "crypto") return cryptoNetwork.split(" ")[0] || "Crypto";
    if (destCategory.id === "cash") return "Espèces";
    return destCategory.label;
  }

  function handleSubmit() {
    if (!selectedSource || !amount || parseFloat(amount) <= 0 || !destCategory) {
      Alert.alert("Erreur", "Remplissez tous les champs.");
      return;
    }
    const destLabel = buildDestLabel();
    addWithdrawal({
      source: selectedSource.type,
      sourceId: selectedSource.id,
      sourceName: selectedSource.name,
      amount: parseFloat(amount),
      currency: fromCurrency,
      amountConverted: convertedAmount,
      toCurrency,
      method: destCategory.id,
      status: "pending",
      date: new Date().toISOString(),
      note: destLabel || note.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setShowAdd(false);
  }

  function resetForm() {
    setStep("source");
    setSelectedSource(null);
    setDestCategory(null);
    setDestAccountId(null);
    setMobileOperator(MOBILE_MONEY_OPERATORS[0]);
    setMobilePhone(""); setMobileRecipient("");
    setBankIban(""); setBankBeneficiary(""); setBankBic("");
    setPaypalEmail(""); setWiseEmail(""); setRevolutTag("");
    setCryptoAddress(""); setCryptoNetwork(CRYPTO_NETWORKS[0]);
    setAmount(""); setFromCurrency("EUR"); setToCurrency("EUR"); setNote("");
  }

  function goBack() {
    if (step === "dest_detail") setStep("destination");
    else if (step === "destination") setStep("source");
    else if (step === "amount") {
      // If dest has no detail step, go back to destination
      const noDetail = ["cash"].includes(destCategory?.id ?? "");
      setStep(noDetail ? "destination" : "dest_detail");
    }
  }

  const STEP_KEYS: Step[] = ["source", "destination", "dest_detail", "amount"];
  const stepIdx = STEP_KEYS.indexOf(step);

  const stepTitle: Record<Step, string> = {
    source: "Source des fonds",
    destination: "Envoyer vers",
    dest_detail: destCategory?.label ?? "Détails destination",
    amount: "Montant & confirmation",
  };

  // ── History filters ────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all");

  const filteredWithdrawals = data.withdrawals.filter((w) => {
    if (filterStatus !== "all" && w.status !== filterStatus) return false;
    if (filterMethod !== "all" && w.method !== filterMethod) return false;
    if (filterPeriod !== "all") {
      const wDate = new Date(w.date);
      const now = new Date();
      if (filterPeriod === "today") {
        if (wDate.toDateString() !== now.toDateString()) return false;
      } else if (filterPeriod === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        if (wDate < weekAgo) return false;
      } else if (filterPeriod === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        if (wDate < monthAgo) return false;
      }
    }
    return true;
  });

  async function exportCSV() {
    if (data.withdrawals.length === 0) {
      Alert.alert("Aucun retrait", "Effectuez d'abord un retrait pour l'exporter.");
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    const header = "Date,Montant,Devise,Converti,Devise cible,Méthode,Statut,Note\n";
    const rows = filteredWithdrawals.map((w) =>
      [
        new Date(w.date).toLocaleDateString("fr-FR"),
        w.amount.toFixed(2),
        w.currency,
        w.amountConverted.toFixed(2),
        w.toCurrency,
        w.method,
        STATUS_LABELS[w.status] ?? w.status,
        `"${(w.note || "").replace(/"/g, "'")}"`,
      ].join(",")
    ).join("\n");
    const csv = header + rows;

    if (!canShare || Platform.OS === "web") {
      Alert.alert("Export CSV", `${filteredWithdrawals.length} retraits prêts à exporter.\n\n${csv.substring(0, 300)}…`);
      return;
    }
    try {
      const path = FileSystem.documentDirectory + "retraits_wealthai.csv";
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exporter les retraits WealthAI" });
    } catch {
      Alert.alert("Erreur", "Impossible d'exporter le fichier.");
    }
  }

  const totalCompleted = data.withdrawals.filter((w) => w.status === "completed");
  const totalEur = totalCompleted.reduce((s, w) => s + w.amount, 0);
  const liveWithdrawals = data.withdrawals.filter((w) => w.status === "pending" || w.status === "processing");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Retraits</Text>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.rateBtn, { backgroundColor: ratesLoading ? colors.muted : colors.success + "22" }]}
            onPress={refresh}
          >
            <Feather name="refresh-cw" size={13} color={ratesLoading ? colors.mutedForeground : colors.success} />
            <Text style={[styles.rateBtnText, { color: ratesLoading ? colors.mutedForeground : colors.success }]}>
              {ratesLoading ? "..." : "Taux live"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {/* ── Live banner ── */}
      {liveWithdrawals.length > 0 && (
        <View style={[styles.liveBanner, { backgroundColor: "#3B82F622", borderColor: "#3B82F6" }]}>
          <PulseDot color="#3B82F6" />
          <Text style={{ color: "#3B82F6", fontSize: 13, fontWeight: "700", flex: 1 }}>
            {liveWithdrawals.length} retrait{liveWithdrawals.length > 1 ? "s" : ""} en cours de traitement…
          </Text>
          <Feather name="clock" size={14} color="#3B82F6" />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      >
        {/* ── Summary ── */}
        <View style={styles.summaryRow}>
          <LinearGradient colors={["#1A2340", "#111828"]} style={[styles.summaryCard, { flex: 1.4 }]}>
            <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Total retiré</Text>
            <Text style={[styles.sumBigValue, { color: colors.primary }]}>
              {totalEur.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.sumSub, { color: colors.mutedForeground }]}>
              {totalCompleted.length} retrait{totalCompleted.length !== 1 ? "s" : ""}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={[styles.smallCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Comptes liés</Text>
              <Text style={[styles.smallValue, { color: colors.success }]}>{data.bankAccounts.length}</Text>
            </View>
            <View style={[styles.smallCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Devises</Text>
              <Text style={[styles.smallValue, { color: colors.foreground }]}>{CURRENCIES.length} pays</Text>
            </View>
          </View>
        </View>

        {/* ── Taux de change rapide ── */}
        <View style={[styles.ratesPreview, { backgroundColor: colors.card }]}>
          <View style={styles.ratesHeader}>
            <Text style={[styles.ratesTitle, { color: colors.foreground }]}>Taux de change (EUR)</Text>
            {lastUpdated && (
              <Text style={[styles.ratesTime, { color: colors.mutedForeground }]}>
                {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.ratesRow}>
              {["USD", "GBP", "XOF", "XAF", "NGN", "MAD", "CHF", "CAD"].map((code) => {
                const rate = rates[code] ?? 0;
                const currency = CURRENCIES.find((c) => c.code === code);
                return (
                  <View key={code} style={[styles.rateChip, { backgroundColor: colors.muted }]}>
                    <Text style={styles.rateFlag}>{currency?.flag}</Text>
                    <Text style={[styles.rateCode, { color: colors.mutedForeground }]}>{code}</Text>
                    <Text style={[styles.rateValue, { color: colors.foreground }]}>
                      {rate.toLocaleString("fr-FR", { maximumFractionDigits: code === "NGN" || code === "XOF" || code === "XAF" ? 0 : 2 })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ── History ── */}
        <View style={styles.historySection}>
          {/* Header row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={[styles.historyTitle, { color: colors.foreground, marginBottom: 0 }]}>
              Historique
              {filteredWithdrawals.length !== data.withdrawals.length
                ? ` (${filteredWithdrawals.length}/${data.withdrawals.length})`
                : ` (${data.withdrawals.length})`}
            </Text>
            {data.withdrawals.length > 0 && (
              <Pressable
                style={[styles.exportBtn, { backgroundColor: colors.success + "22", borderColor: colors.success + "44" }]}
                onPress={exportCSV}
              >
                <Feather name="download" size={13} color={colors.success} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>CSV</Text>
              </Pressable>
            )}
          </View>

          {/* Filter chips — Status */}
          {data.withdrawals.length > 0 && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}
                contentContainerStyle={{ gap: 6 }}>
                {[
                  { key: "all", label: "Tous" },
                  { key: "pending",    label: "En attente",    color: STATUS_COLORS.pending },
                  { key: "processing", label: "En traitement", color: STATUS_COLORS.processing },
                  { key: "completed",  label: "Effectués",     color: STATUS_COLORS.completed },
                  { key: "failed",     label: "Échoués",       color: STATUS_COLORS.failed },
                  { key: "cancelled",  label: "Annulés",       color: STATUS_COLORS.cancelled },
                ].map((f) => {
                  const active = filterStatus === f.key;
                  const c = f.color ?? colors.foreground;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setFilterStatus(f.key)}
                      style={[styles.filterChip, {
                        backgroundColor: active ? c + "22" : colors.card,
                        borderColor: active ? c : colors.border,
                      }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: active ? c : colors.mutedForeground }}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Filter chips — Period */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 6 }}>
                {([
                  { key: "all", label: "Toutes périodes" },
                  { key: "today", label: "Aujourd'hui" },
                  { key: "week", label: "7 derniers jours" },
                  { key: "month", label: "30 derniers jours" },
                ] as { key: "all" | "today" | "week" | "month"; label: string }[]).map((f) => {
                  const active = filterPeriod === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setFilterPeriod(f.key)}
                      style={[styles.filterChip, {
                        backgroundColor: active ? colors.primary + "22" : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.primary : colors.mutedForeground }}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {data.withdrawals.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="arrow-up-right" size={36} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyText, { color: colors.foreground }]}>Aucun retrait enregistré</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Appuyez sur + pour effectuer un retrait</Text>
            </View>
          ) : filteredWithdrawals.length === 0 ? (
            <View style={[styles.empty, { paddingVertical: 24 }]}>
              <Feather name="filter" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.foreground }]}>Aucun résultat</Text>
              <Pressable onPress={() => { setFilterStatus("all"); setFilterPeriod("all"); setFilterMethod("all"); }}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Réinitialiser les filtres</Text>
              </Pressable>
            </View>
          ) : (
            filteredWithdrawals.map((w) => (
              <WithdrawalCard
                key={w.id}
                w={w}
                onDelete={() =>
                  Alert.alert("Supprimer", "Supprimer ce retrait de l'historique ?", [
                    { text: "Annuler", style: "cancel" },
                    { text: "Supprimer", style: "destructive", onPress: () => removeWithdrawal(w.id) },
                  ])
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════
          ADD WITHDRAWAL MODAL — 4 steps
      ══════════════════════════════════════════ */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                {step !== "source" && (
                  <Pressable onPress={goBack} style={{ marginRight: 12 }}>
                    <Feather name="arrow-left" size={22} color={colors.foreground} />
                  </Pressable>
                )}
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{stepTitle[step]}</Text>
              </View>
              <Pressable onPress={() => { resetForm(); setShowAdd(false); }}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Step dots */}
            <View style={styles.stepIndicator}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.stepItem}>
                  <View style={[styles.stepDot, { backgroundColor: stepIdx >= i ? colors.primary : colors.muted }]} />
                  {i < 3 && <View style={[styles.stepLine, { backgroundColor: stepIdx > i ? colors.primary : colors.muted }]} />}
                </View>
              ))}
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* ──────────── STEP 1: SOURCE ──────────── */}
              {step === "source" && (
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>D'où vient l'argent ?</Text>
                  {sources.map((src) => {
                    const selected = selectedSource?.id === src.id && selectedSource?.type === src.type;
                    return (
                      <Pressable
                        key={`${src.type}-${src.id}`}
                        style={[
                          styles.sourceCard,
                          { backgroundColor: selected ? colors.primary + "22" : colors.card },
                          selected && { borderColor: colors.primary, borderWidth: 1.5 },
                        ]}
                        onPress={() => {
                          setSelectedSource(src);
                          setFromCurrency(src.currency);
                          setToCurrency(src.currency);
                        }}
                      >
                        <View style={[styles.srcIcon, { backgroundColor: src.color + "22" }]}>
                          <Feather name={src.icon as "send"} size={20} color={src.color} />
                        </View>
                        <View style={styles.srcInfo}>
                          <Text style={[styles.srcName, { color: colors.foreground }]}>{src.name}</Text>
                          <Text style={[styles.srcAvailable, { color: colors.mutedForeground }]}>
                            Disponible : {src.available.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {src.currency}
                          </Text>
                        </View>
                        {selected && <Feather name="check-circle" size={20} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={[styles.nextBtn, { backgroundColor: selectedSource ? colors.primary : colors.muted }]}
                    onPress={() => { if (selectedSource) setStep("destination"); }}
                    disabled={!selectedSource}
                  >
                    <Text style={[styles.nextBtnText, { color: selectedSource ? colors.primaryForeground : colors.mutedForeground }]}>Continuer</Text>
                    <Feather name="arrow-right" size={18} color={selectedSource ? colors.primaryForeground : colors.mutedForeground} />
                  </Pressable>
                </View>
              )}

              {/* ──────────── STEP 2: DESTINATION CATEGORY ──────────── */}
              {step === "destination" && (
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Où envoyer l'argent ?</Text>

                  {DEST_CATEGORIES.map((cat) => {
                    const isMyAccounts = cat.id === "my_accounts";
                    const hasAccounts = data.bankAccounts.length > 0;
                    const disabled = isMyAccounts && !hasAccounts;
                    const selected = destCategory?.id === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        style={[
                          styles.destCatCard,
                          { backgroundColor: selected ? cat.color + "22" : colors.card },
                          selected && { borderColor: cat.color, borderWidth: 1.5 },
                          disabled && { opacity: 0.4 },
                        ]}
                        onPress={() => { if (!disabled) setDestCategory(cat); }}
                        disabled={disabled}
                      >
                        <View style={[styles.destCatIcon, { backgroundColor: cat.color + "22" }]}>
                          <Feather name={cat.icon as "send"} size={20} color={cat.color} />
                        </View>
                        <View style={styles.destCatInfo}>
                          <Text style={[styles.destCatLabel, { color: colors.foreground }]}>{cat.label}</Text>
                          <Text style={[styles.destCatDesc, { color: colors.mutedForeground }]}>
                            {isMyAccounts && !hasAccounts ? "Ajoutez d'abord un compte dans 'Comptes'" : cat.desc}
                          </Text>
                        </View>
                        {selected && <Feather name="check-circle" size={20} color={cat.color} />}
                      </Pressable>
                    );
                  })}

                  <Pressable
                    style={[styles.nextBtn, { backgroundColor: destCategory ? colors.primary : colors.muted }]}
                    onPress={() => {
                      if (!destCategory) return;
                      if (destCategory.id === "cash") setStep("amount");
                      else setStep("dest_detail");
                    }}
                    disabled={!destCategory}
                  >
                    <Text style={[styles.nextBtnText, { color: destCategory ? colors.primaryForeground : colors.mutedForeground }]}>Continuer</Text>
                    <Feather name="arrow-right" size={18} color={destCategory ? colors.primaryForeground : colors.mutedForeground} />
                  </Pressable>
                </View>
              )}

              {/* ──────────── STEP 3: DESTINATION DETAIL ──────────── */}
              {step === "dest_detail" && destCategory && (
                <View style={styles.stepContent}>

                  {/* MY ACCOUNTS */}
                  {destCategory.id === "my_accounts" && (
                    <>
                      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Choisir un compte destinataire</Text>
                      {data.bankAccounts.map((acc) => {
                        const sel = destAccountId === acc.id;
                        return (
                          <Pressable
                            key={acc.id}
                            style={[
                              styles.sourceCard,
                              { backgroundColor: sel ? acc.color + "22" : colors.card },
                              sel && { borderColor: acc.color, borderWidth: 1.5 },
                            ]}
                            onPress={() => { setDestAccountId(acc.id); setToCurrency(acc.currency); }}
                          >
                            <View style={[styles.srcIcon, { backgroundColor: acc.color + "22" }]}>
                              <Feather name="credit-card" size={20} color={acc.color} />
                            </View>
                            <View style={styles.srcInfo}>
                              <Text style={[styles.srcName, { color: colors.foreground }]}>
                                {acc.bankName}{acc.lastFourDigits ? ` ****${acc.lastFourDigits}` : ""}
                              </Text>
                              <Text style={[styles.srcAvailable, { color: colors.mutedForeground }]}>
                                Solde : {acc.balance.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {acc.currency}
                              </Text>
                            </View>
                            {sel && <Feather name="check-circle" size={20} color={acc.color} />}
                          </Pressable>
                        );
                      })}
                    </>
                  )}

                  {/* MOBILE MONEY */}
                  {destCategory.id === "mobile_money" && (
                    <>
                      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Opérateur Mobile Money</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}
                        contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                        {MOBILE_MONEY_OPERATORS.map((op) => {
                          const sel = mobileOperator.id === op.id;
                          return (
                            <Pressable
                              key={op.id}
                              style={[
                                styles.operatorChip,
                                { backgroundColor: sel ? colors.primary + "22" : colors.card },
                                sel && { borderColor: colors.primary, borderWidth: 1.5 },
                              ]}
                              onPress={() => setMobileOperator(op)}
                            >
                              <Text style={styles.operatorEmoji}>{op.emoji}</Text>
                              <Text style={[styles.operatorName, { color: sel ? colors.primary : colors.foreground }]}>{op.label}</Text>
                              <Text style={[styles.operatorCountries, { color: colors.mutedForeground }]}>{op.countries}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                      <View style={styles.formField}>
                        <View style={styles.fieldLabelRow}>
                          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Numéro de téléphone</Text>
                          <Pressable style={[styles.scanBtn, { backgroundColor: "#22C55E22", borderColor: "#22C55E44" }]} onPress={() => openQR("phone")}>
                            <Feather name="camera" size={13} color="#22C55E" />
                            <Text style={[styles.scanBtnText, { color: "#22C55E" }]}>Scanner QR</Text>
                          </Pressable>
                        </View>
                        <TextInput
                          value={mobilePhone} onChangeText={setMobilePhone}
                          placeholder="+221 77 000 00 00" placeholderTextColor={colors.mutedForeground}
                          keyboardType="phone-pad"
                          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nom du bénéficiaire (optionnel)</Text>
                        <TextInput
                          value={mobileRecipient} onChangeText={setMobileRecipient}
                          placeholder="Prénom Nom" placeholderTextColor={colors.mutedForeground}
                          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        />
                      </View>
                    </>
                  )}

                  {/* BANK TRANSFER */}
                  {destCategory.id === "bank_transfer" && (
                    <>
                      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Coordonnées bancaires</Text>
                      <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bénéficiaire</Text>
                        <TextInput
                          value={bankBeneficiary} onChangeText={setBankBeneficiary}
                          placeholder="Nom Prénom ou société" placeholderTextColor={colors.mutedForeground}
                          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        />
                      </View>
                      <View style={styles.formField}>
                        <View style={styles.fieldLabelRow}>
                          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>IBAN / RIB</Text>
                          <Pressable style={[styles.scanBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F644" }]} onPress={() => openQR("iban")}>
                            <Feather name="camera" size={13} color="#3B82F6" />
                            <Text style={[styles.scanBtnText, { color: "#3B82F6" }]}>Scanner RIB</Text>
                          </Pressable>
                        </View>
                        <TextInput
                          value={bankIban} onChangeText={setBankIban}
                          placeholder="FR76 1234 5678 9012 3456 7890 123" placeholderTextColor={colors.mutedForeground}
                          autoCapitalize="characters"
                          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BIC / SWIFT (optionnel)</Text>
                        <TextInput
                          value={bankBic} onChangeText={setBankBic}
                          placeholder="BNPAFRPPXXX" placeholderTextColor={colors.mutedForeground}
                          autoCapitalize="characters"
                          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        />
                      </View>
                    </>
                  )}

                  {/* PAYPAL */}
                  {destCategory.id === "paypal" && (
                    <View style={styles.formField}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Adresse email PayPal</Text>
                        <Pressable style={[styles.scanBtn, { backgroundColor: "#003EB322", borderColor: "#003EB344" }]} onPress={() => openQR("paypal")}>
                          <Feather name="camera" size={13} color="#3B82F6" />
                          <Text style={[styles.scanBtnText, { color: "#3B82F6" }]}>Scanner QR</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={paypalEmail} onChangeText={setPaypalEmail}
                        placeholder="email@exemple.com" placeholderTextColor={colors.mutedForeground}
                        keyboardType="email-address" autoCapitalize="none"
                        style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                      />
                    </View>
                  )}

                  {/* WISE */}
                  {destCategory.id === "wise" && (
                    <View style={styles.formField}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Email ou numéro Wise</Text>
                        <Pressable style={[styles.scanBtn, { backgroundColor: "#9FE87022", borderColor: "#9FE87044" }]} onPress={() => openQR("wise")}>
                          <Feather name="camera" size={13} color="#22C55E" />
                          <Text style={[styles.scanBtnText, { color: "#22C55E" }]}>Scanner QR</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={wiseEmail} onChangeText={setWiseEmail}
                        placeholder="email@wise.com" placeholderTextColor={colors.mutedForeground}
                        keyboardType="email-address" autoCapitalize="none"
                        style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                      />
                    </View>
                  )}

                  {/* REVOLUT */}
                  {destCategory.id === "revolut" && (
                    <View style={styles.formField}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Tag ou numéro Revolut</Text>
                        <Pressable style={[styles.scanBtn, { backgroundColor: "#7C3AED22", borderColor: "#7C3AED44" }]} onPress={() => openQR("revolut")}>
                          <Feather name="camera" size={13} color="#7C3AED" />
                          <Text style={[styles.scanBtnText, { color: "#7C3AED" }]}>Scanner QR</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={revolutTag} onChangeText={setRevolutTag}
                        placeholder="@votre-tag" placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="none"
                        style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                      />
                    </View>
                  )}

                  {/* CRYPTO */}
                  {destCategory.id === "crypto" && (
                    <>
                      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Réseau blockchain</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}
                        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                        {CRYPTO_NETWORKS.map((net) => {
                          const sel = cryptoNetwork === net;
                          return (
                            <Pressable
                              key={net}
                              style={[
                                styles.networkChip,
                                { backgroundColor: sel ? "#F59E0B22" : colors.card },
                                sel && { borderColor: "#F59E0B", borderWidth: 1.5 },
                              ]}
                              onPress={() => setCryptoNetwork(net)}
                            >
                              <Text style={[styles.networkText, { color: sel ? "#F59E0B" : colors.foreground }]}>{net}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                      <View style={styles.formField}>
                        <View style={styles.fieldLabelRow}>
                          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Adresse du portefeuille</Text>
                          <Pressable style={[styles.scanBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B44" }]} onPress={() => openQR("crypto")}>
                            <Feather name="camera" size={13} color="#F59E0B" />
                            <Text style={[styles.scanBtnText, { color: "#F59E0B" }]}>Scanner Wallet</Text>
                          </Pressable>
                        </View>
                        <TextInput
                          value={cryptoAddress} onChangeText={setCryptoAddress}
                          placeholder="0x... ou bc1..." placeholderTextColor={colors.mutedForeground}
                          autoCapitalize="none" autoCorrect={false}
                          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}
                        />
                      </View>
                      <View style={[styles.warningBanner, { backgroundColor: "#F59E0B11", borderColor: "#F59E0B33" }]}>
                        <Feather name="alert-triangle" size={14} color="#F59E0B" />
                        <Text style={[styles.warningText, { color: "#F59E0B" }]}>
                          Vérifiez l'adresse et le réseau. Les transactions crypto sont irréversibles.
                        </Text>
                      </View>
                    </>
                  )}

                  <Pressable
                    style={[styles.nextBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                    onPress={() => setStep("amount")}
                  >
                    <Text style={[styles.nextBtnText, { color: colors.primaryForeground }]}>Continuer</Text>
                    <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
                  </Pressable>
                </View>
              )}

              {/* ──────────── STEP 4: AMOUNT & CONFIRM ──────────── */}
              {step === "amount" && (
                <View style={styles.stepContent}>

                  {/* Recap banner */}
                  <View style={[styles.recapBanner, { backgroundColor: colors.card }]}>
                    <View style={styles.recapRow}>
                      <View style={[styles.recapIcon, { backgroundColor: selectedSource?.color + "22" }]}>
                        <Feather name={selectedSource?.icon as "send" ?? "credit-card"} size={14} color={selectedSource?.color} />
                      </View>
                      <Text style={[styles.recapText, { color: colors.foreground }]}>{selectedSource?.name}</Text>
                    </View>
                    <Feather name="arrow-down" size={14} color={colors.mutedForeground} style={{ alignSelf: "center", marginVertical: 4 }} />
                    <View style={styles.recapRow}>
                      <View style={[styles.recapIcon, { backgroundColor: destCategory?.color + "22" }]}>
                        <Feather name={destCategory?.icon as "send" ?? "send"} size={14} color={destCategory?.color} />
                      </View>
                      <Text style={[styles.recapText, { color: colors.foreground }]}>{buildDestLabel()}</Text>
                    </View>
                  </View>

                  {/* Amount input */}
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>Montant à retirer</Text>
                  <View style={[styles.amountInputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <TextInput
                      value={amount} onChangeText={setAmount}
                      placeholder="0.00" placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      style={[styles.amountInput, { color: colors.foreground }]}
                      autoFocus
                    />
                    <CurrencyPicker selected={fromCurrency} onSelect={setFromCurrency} colors={colors} />
                  </View>
                  {selectedSource && (
                    <Text style={[styles.availableHint, { color: colors.mutedForeground }]}>
                      Disponible : {selectedSource.available.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {selectedSource.currency}
                    </Text>
                  )}

                  {/* Quick % buttons */}
                  {selectedSource && (
                    <View style={styles.quickAmounts}>
                      {[25, 50, 75, 100].map((pct) => (
                        <Pressable
                          key={pct}
                          style={[styles.quickPct, { backgroundColor: colors.muted }]}
                          onPress={() => setAmount(((selectedSource.available * pct) / 100).toFixed(2))}
                        >
                          <Text style={[styles.quickPctText, { color: colors.foreground }]}>{pct}%</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Currency conversion */}
                  <View style={[styles.conversionCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.convLabel, { color: colors.mutedForeground }]}>Convertir en</Text>
                    <View style={styles.convRow}>
                      <View style={styles.convAmount}>
                        <Text style={[styles.convValue, { color: colors.primary }]}>
                          {convertedAmount > 0 ? convertedAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—"}
                        </Text>
                        <Text style={[styles.convCurr, { color: colors.mutedForeground }]}>
                          {CURRENCIES.find((c) => c.code === toCurrency)?.name}
                        </Text>
                      </View>
                      <CurrencyPicker selected={toCurrency} onSelect={setToCurrency} colors={colors} />
                    </View>
                    {fromCurrency !== toCurrency && rates[toCurrency] && rates[fromCurrency] && (
                      <Text style={[styles.rateHint, { color: colors.mutedForeground }]}>
                        1 {fromCurrency} = {(rates[toCurrency] / rates[fromCurrency]).toLocaleString("fr-FR", { maximumFractionDigits: 4 })} {toCurrency}
                      </Text>
                    )}
                  </View>

                  {/* Note */}
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optionnel)</Text>
                    <TextInput
                      value={note} onChangeText={setNote}
                      placeholder="Ex: Loyer, urgence, vacances..."
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    />
                  </View>

                  {/* Confirm */}
                  <Pressable
                    style={[styles.confirmBtn, { backgroundColor: amount && parseFloat(amount) > 0 ? colors.primary : colors.muted }]}
                    onPress={handleSubmit}
                    disabled={!amount || parseFloat(amount) <= 0}
                  >
                    <Feather name="check" size={20} color={amount && parseFloat(amount) > 0 ? colors.primaryForeground : colors.mutedForeground} />
                    <Text style={[styles.confirmBtnText, { color: amount && parseFloat(amount) > 0 ? colors.primaryForeground : colors.mutedForeground }]}>
                      Confirmer le retrait
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* QR Scanner */}
      <QRScanner
        visible={showQR}
        onClose={() => setShowQR(false)}
        onScan={handleQRScan}
        hint={
          qrTarget === "crypto" ? "Scannez l'adresse de votre portefeuille crypto (Bitcoin, Ethereum, Tron…)" :
          qrTarget === "phone"  ? "Scannez le QR code Mobile Money (Orange, Wave, MTN…)" :
          qrTarget === "iban"   ? "Scannez le RIB QR code de votre banque" :
          qrTarget === "paypal" ? "Scannez votre QR code PayPal.me" :
          qrTarget === "wise"   ? "Scannez votre QR code Wise" :
          qrTarget === "revolut"? "Scannez votre QR code Revolut" :
          "Scannez le QR code de paiement"
        }
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  rateBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  rateBtnText: { fontSize: 12, fontWeight: "600" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  summaryCard: { borderRadius: 18, padding: 18 },
  sumLabel: { fontSize: 12, marginBottom: 4 },
  sumBigValue: { fontSize: 26, fontWeight: "800" },
  sumSub: { fontSize: 12, marginTop: 4 },
  smallCard: { borderRadius: 14, padding: 14 },
  smallValue: { fontSize: 18, fontWeight: "700" },
  ratesPreview: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  ratesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  ratesTitle: { fontSize: 14, fontWeight: "600" },
  ratesTime: { fontSize: 11 },
  ratesRow: { flexDirection: "row", gap: 10 },
  rateChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", gap: 3 },
  rateFlag: { fontSize: 18 },
  rateCode: { fontSize: 11, fontWeight: "600" },
  rateValue: { fontSize: 13, fontWeight: "700" },
  historySection: { paddingHorizontal: 20 },
  historyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 14 },
  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 13 },
  wCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  wCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  wIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  wCardInfo: { flex: 1 },
  wCardSource: { fontSize: 15, fontWeight: "700" },
  wCardMethod: { fontSize: 12, marginTop: 2 },
  wCardDivider: { height: 1, marginVertical: 12 },
  wCardBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  wAmountLabel: { fontSize: 11, marginBottom: 2 },
  wAmount: { fontSize: 18, fontWeight: "700" },
  wArrow: { flex: 0 },
  wAmountConverted: { fontSize: 18, fontWeight: "700" },
  wStatus: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  wStatusText: { fontSize: 12, fontWeight: "700" },
  wNote: { fontSize: 12, marginTop: 8, fontStyle: "italic" },
  modal: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitleRow: { flexDirection: "row", alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  stepIndicator: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepContent: { gap: 0 },
  stepLabel: { fontSize: 14, marginBottom: 14 },
  sourceCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, marginBottom: 10 },
  srcIcon: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  srcInfo: { flex: 1 },
  srcName: { fontSize: 15, fontWeight: "600" },
  srcAvailable: { fontSize: 12, marginTop: 2 },
  destCatCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 10 },
  destCatIcon: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  destCatInfo: { flex: 1 },
  destCatLabel: { fontSize: 15, fontWeight: "600" },
  destCatDesc: { fontSize: 12, marginTop: 2 },
  formField: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  textInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  operatorChip: { borderRadius: 14, padding: 12, alignItems: "center", gap: 4, minWidth: 100 },
  operatorEmoji: { fontSize: 24 },
  operatorName: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  operatorCountries: { fontSize: 10, textAlign: "center" },
  networkChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  networkText: { fontSize: 13, fontWeight: "600" },
  warningBanner: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18 },
  recapBanner: { borderRadius: 14, padding: 14, marginBottom: 18 },
  recapRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recapIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  recapText: { fontSize: 14, fontWeight: "600", flex: 1 },
  amountInputRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingLeft: 20, marginBottom: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "700", paddingVertical: 18 },
  availableHint: { fontSize: 12, marginBottom: 14 },
  quickAmounts: { flexDirection: "row", gap: 10, marginBottom: 18 },
  quickPct: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  quickPctText: { fontSize: 14, fontWeight: "600" },
  conversionCard: { borderRadius: 16, padding: 16, marginBottom: 18 },
  convLabel: { fontSize: 12, marginBottom: 10 },
  convRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convAmount: { flex: 1 },
  convValue: { fontSize: 24, fontWeight: "800" },
  convCurr: { fontSize: 12, marginTop: 2 },
  rateHint: { fontSize: 12, marginTop: 10 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14, marginTop: 8, marginBottom: 32 },
  nextBtnText: { fontSize: 16, fontWeight: "700" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 18, borderRadius: 16, marginTop: 8, marginBottom: 48 },
  confirmBtnText: { fontSize: 17, fontWeight: "700" },
  currencyBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  currencyFlag: { fontSize: 18 },
  currencyCode: { fontSize: 14, fontWeight: "700" },
  pickerModal: { flex: 1, padding: 20 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pickerTitle: { fontSize: 20, fontWeight: "700" },
  currencyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, gap: 12 },
  currencyRowFlag: { fontSize: 24 },
  currencyRowInfo: { flex: 1 },
  currencyRowCode: { fontSize: 15, fontWeight: "700" },
  currencyRowName: { fontSize: 12, marginTop: 2 },
  currencyRowSymbol: { fontSize: 16, fontWeight: "600", marginRight: 8 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  scanBtnText: { fontSize: 11, fontWeight: "700" },
  liveBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});

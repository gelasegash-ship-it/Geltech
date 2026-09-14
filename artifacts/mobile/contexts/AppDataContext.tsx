import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  category: "stock" | "crypto" | "etf" | "other";
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
  accountId?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

export interface Withdrawal {
  id: string;
  source: "investment" | "savings" | "budget" | "account";
  sourceId: string;
  sourceName: string;
  amount: number;
  currency: string;
  amountConverted: number;
  toCurrency: string;
  method: string;
  status: "completed" | "pending" | "processing" | "failed" | "cancelled";
  date: string;
  processingStartedAt?: string;
  note?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: "checking" | "savings" | "livret_a" | "pel" | "cel" | "pro" | "other";
  balance: number;
  currency: string;
  lastFourDigits?: string;
  color: string;
  lastUpdated: string;
  note?: string;
}

export interface AISettings {
  learningEnabled: boolean;
  anomalyAlertsEnabled: boolean;
  autoCategorizationEnabled: boolean;
  voiceEnabled: boolean;
  requireApprovalForActions: boolean;
}

export interface ConnectedProvider {
  id: string;
  provider: "plaid" | "wise" | "mercury";
  label: string;
  status: "pending" | "connected" | "error";
  lastSyncedAt?: string;
}

export interface AppData {
  investments: Investment[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  withdrawals: Withdrawal[];
  bankAccounts: BankAccount[];
  monthlyIncome: number;
  monthlyBudget: number;
  aiSettings: AISettings;
  connectedProviders: ConnectedProvider[];
}

interface AppDataContextType {
  data: AppData;
  addInvestment: (inv: Omit<Investment, "id">) => void;
  removeInvestment: (id: string) => void;
  updateInvestmentPrice: (id: string, price: number) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  removeTransaction: (id: string) => void;
  addSavingsGoal: (g: Omit<SavingsGoal, "id">) => void;
  updateSavingsGoal: (id: string, current: number) => void;
  removeSavingsGoal: (id: string) => void;
  addWithdrawal: (w: Omit<Withdrawal, "id">) => void;
  removeWithdrawal: (id: string) => void;
  updateWithdrawalStatus: (id: string, status: Withdrawal["status"]) => void;
  addBankAccount: (a: Omit<BankAccount, "id">) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  removeBankAccount: (id: string) => void;
  updateAISettings: (updates: Partial<AISettings>) => void;
  removeConnectedProvider: (id: string) => void;
  setMonthlyIncome: (v: number) => void;
  setMonthlyBudget: (v: number) => void;
  netWorth: number;
  totalInvested: number;
  totalGains: number;
  monthlyExpenses: number;
  monthlySavings: number;
  totalWithdrawn: number;
  totalBankBalance: number;
}

const STORAGE_KEY = "@wealthai_data_v3";

const defaultData: AppData = {
  investments: [
    { id: "1", symbol: "AAPL", name: "Apple Inc.", category: "stock", quantity: 5, buyPrice: 150, currentPrice: 189, currency: "USD" },
    { id: "2", symbol: "BTC", name: "Bitcoin", category: "crypto", quantity: 0.05, buyPrice: 42000, currentPrice: 67000, currency: "USD" },
    { id: "3", symbol: "MSFT", name: "Microsoft", category: "stock", quantity: 3, buyPrice: 370, currentPrice: 415, currency: "USD" },
  ],
  transactions: [
    { id: "1", type: "income", category: "Salaire", description: "Salaire mensuel", amount: 3500, date: new Date().toISOString() },
    { id: "2", type: "expense", category: "Logement", description: "Loyer", amount: 900, date: new Date().toISOString() },
    { id: "3", type: "expense", category: "Alimentation", description: "Courses", amount: 350, date: new Date().toISOString() },
    { id: "4", type: "expense", category: "Transport", description: "Abonnement metro", amount: 85, date: new Date().toISOString() },
  ],
  savingsGoals: [
    { id: "1", name: "Vacances", target: 3000, current: 1200, deadline: "2025-08-01" },
    { id: "2", name: "Fonds urgence", target: 10000, current: 6500, deadline: "2025-12-31" },
  ],
  withdrawals: [],
  bankAccounts: [],
  monthlyIncome: 3500,
  monthlyBudget: 2000,
  aiSettings: {
    learningEnabled: true,
    anomalyAlertsEnabled: true,
    autoCategorizationEnabled: true,
    voiceEnabled: true,
    requireApprovalForActions: true,
  },
  connectedProviders: [],
};

const AppDataContext = createContext<AppDataContextType | null>(null);

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AppData;
          if (!parsed.withdrawals) parsed.withdrawals = [];
          if (!parsed.bankAccounts) parsed.bankAccounts = [];
           if (!parsed.aiSettings) parsed.aiSettings = defaultData.aiSettings;
           if (!parsed.connectedProviders) parsed.connectedProviders = [];
          setData(parsed);
        } catch {
          setData(defaultData);
        }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  const addInvestment = (inv: Omit<Investment, "id">) =>
    setData((d) => ({ ...d, investments: [...d.investments, { ...inv, id: genId() }] }));
  const removeInvestment = (id: string) =>
    setData((d) => ({ ...d, investments: d.investments.filter((i) => i.id !== id) }));
  const updateInvestmentPrice = (id: string, price: number) =>
    setData((d) => ({ ...d, investments: d.investments.map((i) => i.id === id ? { ...i, currentPrice: price } : i) }));

  const addTransaction = (t: Omit<Transaction, "id">) =>
    setData((d) => ({ ...d, transactions: [{ ...t, id: genId() }, ...d.transactions] }));
  const removeTransaction = (id: string) =>
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));

  const addSavingsGoal = (g: Omit<SavingsGoal, "id">) =>
    setData((d) => ({ ...d, savingsGoals: [...d.savingsGoals, { ...g, id: genId() }] }));
  const updateSavingsGoal = (id: string, current: number) =>
    setData((d) => ({ ...d, savingsGoals: d.savingsGoals.map((g) => g.id === id ? { ...g, current } : g) }));
  const removeSavingsGoal = (id: string) =>
    setData((d) => ({ ...d, savingsGoals: d.savingsGoals.filter((g) => g.id !== id) }));

  const addWithdrawal = (w: Omit<Withdrawal, "id">) =>
    setData((d) => ({ ...d, withdrawals: [{ ...w, id: genId() }, ...d.withdrawals] }));
  const removeWithdrawal = (id: string) =>
    setData((d) => ({ ...d, withdrawals: d.withdrawals.filter((w) => w.id !== id) }));
  const updateWithdrawalStatus = (id: string, status: Withdrawal["status"]) =>
    setData((d) => ({
      ...d,
      withdrawals: d.withdrawals.map((w) =>
        w.id === id
          ? { ...w, status, ...(status === "processing" ? { processingStartedAt: new Date().toISOString() } : {}) }
          : w
      ),
    }));

  const addBankAccount = (a: Omit<BankAccount, "id">) =>
    setData((d) => ({ ...d, bankAccounts: [...d.bankAccounts, { ...a, id: genId() }] }));
  const updateBankAccount = (id: string, updates: Partial<BankAccount>) =>
    setData((d) => ({
      ...d,
      bankAccounts: d.bankAccounts.map((a) =>
        a.id === id ? { ...a, ...updates, lastUpdated: new Date().toISOString() } : a
      ),
    }));
  const removeBankAccount = (id: string) =>
    setData((d) => ({ ...d, bankAccounts: d.bankAccounts.filter((a) => a.id !== id) }));
  const updateAISettings = (updates: Partial<AISettings>) =>
    setData((d) => ({ ...d, aiSettings: { ...d.aiSettings, ...updates } }));
  const removeConnectedProvider = (id: string) =>
    setData((d) => ({ ...d, connectedProviders: d.connectedProviders.filter((p) => p.id !== id) }));

  const setMonthlyIncome = (v: number) => setData((d) => ({ ...d, monthlyIncome: v }));
  const setMonthlyBudget = (v: number) => setData((d) => ({ ...d, monthlyBudget: v }));

  const totalInvested = data.investments.reduce((s, i) => s + i.buyPrice * i.quantity, 0);
  const totalValue = data.investments.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
  const totalGains = totalValue - totalInvested;
  const monthlyExpenses = data.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlySavings = data.monthlyIncome - monthlyExpenses;
  const totalWithdrawn = data.withdrawals.filter((w) => w.status === "completed").reduce((s, w) => s + w.amount, 0);
  const totalBankBalance = data.bankAccounts.reduce((s, a) => s + a.balance, 0);
  const savingsTotal = data.savingsGoals.reduce((s, g) => s + g.current, 0);
  const netWorth = totalValue + savingsTotal + totalBankBalance;

  return (
    <AppDataContext.Provider value={{
      data, addInvestment, removeInvestment, updateInvestmentPrice,
      addTransaction, removeTransaction, addSavingsGoal, updateSavingsGoal, removeSavingsGoal,
      addWithdrawal, removeWithdrawal, updateWithdrawalStatus, addBankAccount, updateBankAccount, removeBankAccount,
       updateAISettings, removeConnectedProvider,
      setMonthlyIncome, setMonthlyBudget,
      netWorth, totalInvested, totalGains, monthlyExpenses, monthlySavings, totalWithdrawn, totalBankBalance,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

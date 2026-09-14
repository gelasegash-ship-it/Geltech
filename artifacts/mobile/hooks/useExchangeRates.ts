import { useEffect, useState } from "react";

export interface ExchangeRates {
  [currency: string]: number;
}

export const CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "USD", name: "Dollar US", symbol: "$", flag: "🇺🇸" },
  { code: "GBP", name: "Livre sterling", symbol: "£", flag: "🇬🇧" },
  { code: "CHF", name: "Franc suisse", symbol: "CHF", flag: "🇨🇭" },
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "CFA", flag: "🌍" },
  { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "CFA", flag: "🌍" },
  { code: "NGN", name: "Naira nigérian", symbol: "₦", flag: "🇳🇬" },
  { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵", flag: "🇬🇭" },
  { code: "MAD", name: "Dirham marocain", symbol: "MAD", flag: "🇲🇦" },
  { code: "TND", name: "Dinar tunisien", symbol: "DT", flag: "🇹🇳" },
  { code: "DZD", name: "Dinar algérien", symbol: "DA", flag: "🇩🇿" },
  { code: "CAD", name: "Dollar canadien", symbol: "CA$", flag: "🇨🇦" },
  { code: "AUD", name: "Dollar australien", symbol: "A$", flag: "🇦🇺" },
  { code: "JPY", name: "Yen japonais", symbol: "¥", flag: "🇯🇵" },
  { code: "CNY", name: "Yuan chinois", symbol: "¥", flag: "🇨🇳" },
  { code: "AED", name: "Dirham EAU", symbol: "AED", flag: "🇦🇪" },
  { code: "SAR", name: "Riyal saoudien", symbol: "SAR", flag: "🇸🇦" },
  { code: "BRL", name: "Réal brésilien", symbol: "R$", flag: "🇧🇷" },
  { code: "INR", name: "Roupie indienne", symbol: "₹", flag: "🇮🇳" },
  { code: "MXN", name: "Peso mexicain", symbol: "MX$", flag: "🇲🇽" },
];

// Fallback rates relative to EUR (in case API is unavailable)
const FALLBACK_RATES: ExchangeRates = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.96,
  XOF: 655.96,
  XAF: 655.96,
  NGN: 1680.0,
  GHS: 16.5,
  MAD: 10.8,
  TND: 3.32,
  DZD: 145.0,
  CAD: 1.47,
  AUD: 1.65,
  JPY: 163.5,
  CNY: 7.82,
  AED: 3.97,
  SAR: 4.05,
  BRL: 5.52,
  INR: 90.2,
  MXN: 18.6,
};

export function useExchangeRates(baseCurrency = "EUR") {
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchRates();
  }, [baseCurrency]);

  async function fetchRates() {
    setLoading(true);
    try {
      // Free exchange rate API — no key needed
      const res = await fetch(
        `https://open.er-api.com/v6/latest/${baseCurrency}`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const data = await res.json() as { rates: ExchangeRates; result: string };
        if (data.result === "success" && data.rates) {
          setRates(data.rates);
          setLastUpdated(new Date());
        }
      }
    } catch {
      // keep fallback rates
    } finally {
      setLoading(false);
    }
  }

  function convert(amount: number, from: string, to: string): number {
    const fromRate = rates[from] ?? 1;
    const toRate = rates[to] ?? 1;
    // Convert to base currency first, then to target
    const inBase = amount / fromRate;
    return inBase * toRate;
  }

  return { rates, loading, lastUpdated, convert, refresh: fetchRates };
}

import { useEffect, useRef, useState } from "react";

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  DOGE: "dogecoin",
  LTC: "litecoin",
  ATOM: "cosmos",
  NEAR: "near",
  FTM: "fantom",
  BNB: "binancecoin",
};

export interface LivePrices {
  [symbol: string]: number;
}

export function useLivePrices(
  symbols: string[],
  intervalMs = 30000
): { prices: LivePrices; loading: boolean; lastUpdated: Date | null; refresh: () => void } {
  const [prices, setPrices] = useState<LivePrices>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cryptoSymbols = symbols.filter((s) => SYMBOL_TO_COINGECKO[s]);

  async function fetchPrices() {
    if (cryptoSymbols.length === 0) return;
    setLoading(true);
    try {
      const ids = cryptoSymbols.map((s) => SYMBOL_TO_COINGECKO[s]).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return;
      const data = await res.json() as Record<string, { usd: number }>;
      const updated: LivePrices = {};
      for (const symbol of cryptoSymbols) {
        const id = SYMBOL_TO_COINGECKO[symbol];
        if (data[id]?.usd) {
          updated[symbol] = data[id].usd;
        }
      }
      setPrices((prev) => ({ ...prev, ...updated }));
      setLastUpdated(new Date());
    } catch {
      // silently fail - keep previous prices
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbols.join(",")]);

  return { prices, loading, lastUpdated, refresh: fetchPrices };
}

import { useEffect, useRef, useState } from "react";

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap_rank: number;
  image: string;
}

export function useMarketData(limit = 10, intervalMs = 60000) {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetch_data() {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const data = await res.json() as CoinData[];
        setCoins(data);
        setLastUpdated(new Date());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch_data();
    timerRef.current = setInterval(fetch_data, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return { coins, loading, lastUpdated, refresh: fetch_data };
}

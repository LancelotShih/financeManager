import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: () => api.portfolios.list(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => api.portfolios.get(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function usePortfolioHistory(
  holdings: Record<string, number>,
  baseValue: number,
  period: string
) {
  const holdingsKey = Object.entries(holdings)
    .map(([s, q]) => `${s}:${q}`)
    .join(",");
  return useQuery({
    queryKey: ["portfolio-history", holdingsKey, baseValue, period],
    queryFn: () => api.market.portfolioHistory(holdings, baseValue, period),
    staleTime: 300_000,
    enabled: Object.keys(holdings).length > 0,
  });
}

export function useTickerHistory(symbol: string, period: string) {
  return useQuery({
    queryKey: ["ticker-history", symbol, period],
    queryFn: () => api.market.tickerHistory(symbol, period),
    staleTime: 300_000,
    enabled: !!symbol,
  });
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.auth.status(),
    staleTime: 30_000,
  });
}

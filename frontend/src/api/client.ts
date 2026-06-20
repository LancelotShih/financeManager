import type { AuthStatus, HistoryPoint, Portfolio, PortfolioSummary } from "@/types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    status: () => request<AuthStatus>("/auth/status"),
    setCookies: (cookies: string) =>
      request<AuthStatus>("/auth/set-cookies", {
        method: "POST",
        body: JSON.stringify({ cookies }),
      }),
    uploadFile: async (file: File): Promise<AuthStatus> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/auth/upload-cookies`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Upload failed");
      }
      return res.json();
    },
  },
  portfolios: {
    list: () => request<PortfolioSummary>("/portfolios/"),
    get: (id: string) => request<Portfolio>(`/portfolios/${id}`),
  },
  market: {
    tickerHistory: (symbol: string, period = "6m") =>
      request<{ symbol: string; history: HistoryPoint[] }>(
        `/market/history/${symbol}?period=${period}`
      ),
    portfolioHistory: (holdings: Record<string, number>, baseValue: number, period = "6m") => {
      const holdingsParam = Object.entries(holdings)
        .map(([sym, qty]) => `${sym}:${qty}`)
        .join(",");
      return request<HistoryPoint[]>(
        `/market/portfolio-history?holdings=${encodeURIComponent(holdingsParam)}&base_value=${baseValue}&period=${period}`
      );
    },
  },
};

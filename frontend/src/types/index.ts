export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  cost_basis: number | null;
  avg_cost: number | null;
  day_change: number;
  day_change_pct: number;
  unrealized_gain: number | null;
  unrealized_gain_pct: number | null;
}

export interface Portfolio {
  id: string;
  name: string;
  account_type: "linked" | "watchlist" | "manual";
  holdings: Holding[];
  total_value: number;
  total_cost_basis: number | null;
  day_change: number;
  day_change_pct: number;
  unrealized_gain: number | null;
  unrealized_gain_pct: number | null;
  cash?: number;
}

export interface PortfolioSummary {
  total_value: number;
  day_change: number;
  day_change_pct: number;
  unrealized_gain: number | null;
  cash_holdings: number;
  portfolios: Portfolio[];
}

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface AuthStatus {
  authenticated: boolean;
  message: string;
}

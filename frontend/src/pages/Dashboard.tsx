import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { usePortfolioSummary, usePortfolioHistory } from "@/hooks/usePortfolios";
import PerformanceChart from "@/components/charts/PerformanceChart";
import AllocationChart from "@/components/charts/AllocationChart";
import PortfolioCard from "@/components/portfolio/PortfolioCard";

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <p className="text-text-secondary text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && (
        <p className={clsx("text-sm mt-1 font-medium", positive === true ? "gain" : positive === false ? "loss" : "text-text-secondary")}>
          {sub}
        </p>
      )}
    </div>
  );
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function Dashboard() {
  const [period, setPeriod] = useState("6m");
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePortfolioSummary();

  // Build holdings map (symbol → shares) for tickers with a live price.
  // Zero-price holdings (money markets, bonds) and cash go into baseValue as a constant.
  const { holdingsMap, baseValue } = (() => {
    const map: Record<string, number> = {};
    let constant = 0;
    (data?.portfolios ?? [])
      .filter((p) => p.account_type !== "watchlist")
      .forEach((p) => {
        constant += p.cash ?? 0;
        p.holdings.forEach((h) => {
          if (h.price > 0 && h.shares > 0) {
            map[h.symbol] = (map[h.symbol] ?? 0) + h.shares;
          } else {
            constant += h.value;
          }
        });
      });
    return { holdingsMap: map, baseValue: constant };
  })();

  const { data: histData, isLoading: histLoading } = usePortfolioHistory(holdingsMap, baseValue, period);

  const allHoldings =
    data?.portfolios
      .filter((p) => p.account_type !== "watchlist")
      .flatMap((p) => p.holdings) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading portfolios…
      </div>
    );
  }

  if (error) {
    const msg = (error as Error).message;
    const needsSetup = msg.includes("401") || msg.includes("cookies");
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-loss-light" />
        <p className="text-text-primary font-medium">{msg}</p>
        {needsSetup && (
          <button
            onClick={() => navigate("/setup")}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/80 transition-colors"
          >
            Go to Setup
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Portfolio Overview</h1>
          <p className="text-text-secondary text-sm mt-0.5">All accounts combined</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-bg-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Value" value={fmtMoney(data.total_value)} />
        <StatCard
          label="Day Change"
          value={fmtMoney(data.day_change)}
          sub={fmtPct(data.day_change_pct)}
          positive={data.day_change >= 0}
        />
        {data.unrealized_gain !== null && (
          <StatCard
            label="Unrealized G/L"
            value={fmtMoney(data.unrealized_gain)}
            positive={data.unrealized_gain >= 0}
          />
        )}
        <StatCard
          label="Accounts"
          value={String(data.portfolios.filter((p) => p.account_type === "linked").length)}
          sub={`${data.portfolios.length} total portfolios`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PerformanceChart
            data={histData ?? []}
            period={period}
            onPeriodChange={setPeriod}
            loading={histLoading}
          />
        </div>
        <AllocationChart holdings={allHoldings} />
      </div>

      {/* Portfolio cards */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Accounts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

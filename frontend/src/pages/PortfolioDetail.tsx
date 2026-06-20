import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { usePortfolio, usePortfolioHistory } from "@/hooks/usePortfolios";
import PerformanceChart from "@/components/charts/PerformanceChart";
import AllocationChart from "@/components/charts/AllocationChart";
import HoldingsTable from "@/components/portfolio/HoldingsTable";

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState("6m");
  const { data, isLoading, error, refetch } = usePortfolio(id!);

  const { holdingsMap, baseValue } = (() => {
    const map: Record<string, number> = {};
    let constant = data?.cash ?? 0;
    (data?.holdings ?? []).forEach((h) => {
      if (h.price > 0 && h.shares > 0) {
        map[h.symbol] = (map[h.symbol] ?? 0) + h.shares;
      } else {
        constant += h.value;
      }
    });
    return { holdingsMap: map, baseValue: constant };
  })();
  const { data: histData, isLoading: histLoading } = usePortfolioHistory(holdingsMap, baseValue, period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <p className="text-loss-light">{(error as Error)?.message ?? "Portfolio not found"}</p>
        <Link to="/" className="text-accent-purple text-sm hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const isUp = data.day_change >= 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/portfolios"
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Portfolios
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{data.name}</h1>
          <p className="text-text-secondary text-sm capitalize mt-0.5">{data.account_type} account</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-bg-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Market Value", val: fmtMoney(data.total_value) },
          {
            label: "Day Change",
            val: `${isUp ? "+" : ""}${fmtMoney(data.day_change)}`,
            sub: fmtPct(data.day_change_pct),
            pos: isUp,
          },
          data.unrealized_gain !== null
            ? {
                label: "Unrealized G/L",
                val: `${data.unrealized_gain >= 0 ? "+" : ""}${fmtMoney(data.unrealized_gain)}`,
                sub: data.unrealized_gain_pct !== null ? fmtPct(data.unrealized_gain_pct) : undefined,
                pos: data.unrealized_gain >= 0,
              }
            : null,
          { label: "Positions", val: String(data.holdings.length) },
        ]
          .filter(Boolean)
          .map((s, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-5">
              <p className="text-text-secondary text-xs uppercase tracking-wide mb-1">{s!.label}</p>
              <p className={clsx("text-xl font-bold", s!.pos === true ? "gain" : s!.pos === false ? "loss" : "text-text-primary")}>
                {s!.val}
              </p>
              {s!.sub && (
                <p className={clsx("text-sm mt-1", s!.pos === true ? "gain" : s!.pos === false ? "loss" : "text-text-secondary")}>
                  {s!.sub}
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PerformanceChart
            data={histData ?? []}
            period={period}
            onPeriodChange={setPeriod}
            loading={histLoading}
          />
        </div>
        <AllocationChart holdings={data.holdings} />
      </div>

      {/* Holdings table */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Holdings
        </h2>
        <HoldingsTable holdings={data.holdings} />
      </div>
    </div>
  );
}

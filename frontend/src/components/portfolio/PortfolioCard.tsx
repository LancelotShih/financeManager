import { Link } from "react-router-dom";
import { ChevronRight, Link2, Eye, Pencil } from "lucide-react";
import clsx from "clsx";
import type { Portfolio } from "@/types";

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const ACCOUNT_ICONS = {
  linked: Link2,
  watchlist: Eye,
  manual: Pencil,
};

export default function PortfolioCard({ portfolio: p }: { portfolio: Portfolio }) {
  const Icon = ACCOUNT_ICONS[p.account_type];
  const isUp = p.day_change >= 0;

  return (
    <Link
      to={`/portfolios/${p.id}`}
      className="block bg-bg-card border border-border rounded-xl p-5 hover:border-accent-purple/50 hover:bg-bg-hover transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-text-primary font-medium text-sm truncate">{p.name}</p>
            <p className="text-text-muted text-xs capitalize">{p.account_type}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary flex-shrink-0 mt-1" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-text-secondary text-xs">Market Value</span>
          <span className="text-text-primary font-semibold">{fmtMoney(p.total_value)}</span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-text-secondary text-xs">Today</span>
          <span className={clsx("text-sm font-medium", isUp ? "gain" : "loss")}>
            {isUp ? "+" : ""}{fmtMoney(p.day_change)} ({fmtPct(p.day_change_pct)})
          </span>
        </div>

        {p.unrealized_gain !== null && (
          <div className="flex justify-between items-baseline">
            <span className="text-text-secondary text-xs">Unrealized</span>
            <span
              className={clsx(
                "text-sm font-medium",
                p.unrealized_gain >= 0 ? "gain" : "loss"
              )}
            >
              {p.unrealized_gain >= 0 ? "+" : ""}
              {fmtMoney(p.unrealized_gain)}
              {p.unrealized_gain_pct !== null && (
                <span className="text-xs ml-1">({fmtPct(p.unrealized_gain_pct)})</span>
              )}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-border flex justify-between items-center">
          <span className="text-text-muted text-xs">{p.holdings.length} positions</span>
        </div>
      </div>
    </Link>
  );
}

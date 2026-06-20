import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import clsx from "clsx";
import type { Holding } from "@/types";

type SortKey = keyof Pick<
  Holding,
  "symbol" | "value" | "day_change_pct" | "unrealized_gain_pct" | "shares" | "price"
>;

function fmtMoney(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const COLS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "price", label: "Price", align: "right" },
  { key: "shares", label: "Shares", align: "right" },
  { key: "value", label: "Value", align: "right" },
  { key: "day_change_pct", label: "Day %", align: "right" },
  { key: "unrealized_gain_pct", label: "Return %", align: "right" },
];

export default function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [asc, setAsc] = useState(false);

  const sorted = [...holdings].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    return asc
      ? typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      : typeof bv === "string" ? bv.localeCompare(av as string) : (bv as number) - (av as number);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc(!asc);
    else { setSortKey(key); setAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return asc
      ? <ArrowUp className="w-3 h-3 text-accent-purple" />
      : <ArrowDown className="w-3 h-3 text-accent-purple" />;
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className={clsx(
                  "px-4 py-3 text-text-secondary font-medium cursor-pointer select-none hover:text-text-primary transition-colors",
                  c.align === "right" ? "text-right" : "text-left"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  <SortIcon k={c.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((h, i) => {
            const dayUp = h.day_change_pct >= 0;
            const retUp = (h.unrealized_gain_pct ?? 0) >= 0;
            return (
              <tr
                key={h.symbol}
                className={clsx(
                  "border-b border-border/50 hover:bg-bg-hover transition-colors",
                  i % 2 === 0 ? "" : "bg-bg-secondary/30"
                )}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-text-primary">{h.symbol}</p>
                    <p className="text-text-muted text-xs truncate max-w-[180px]">{h.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">
                  {fmtMoney(h.price)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">
                  {h.shares > 0 ? h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium text-text-primary">
                  {fmtMoney(h.value)}
                </td>
                <td className={clsx("px-4 py-3 text-right font-mono", dayUp ? "gain" : "loss")}>
                  {fmtPct(h.day_change_pct)}
                </td>
                <td className={clsx("px-4 py-3 text-right font-mono", h.unrealized_gain_pct === null ? "text-text-muted" : retUp ? "gain" : "loss")}>
                  {fmtPct(h.unrealized_gain_pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {holdings.length === 0 && (
        <p className="text-center py-8 text-text-muted text-sm">No holdings found</p>
      )}
    </div>
  );
}

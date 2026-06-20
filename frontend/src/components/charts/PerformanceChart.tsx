import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HistoryPoint } from "@/types";

const PERIODS = ["1d", "5d", "1m", "6m", "ytd", "1y", "all"] as const;

interface Props {
  data: HistoryPoint[];
  period: string;
  onPeriodChange: (p: string) => void;
  loading?: boolean;
}

function fmt(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(1)}K`
    : `$${n.toFixed(2)}`;
}

export default function PerformanceChart({ data, period, onPeriodChange, loading }: Props) {
  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const isUp = last >= first;
  const color = isUp ? "#4ade80" : "#f87171";

  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Portfolio Performance
        </h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === p
                  ? "bg-accent-purple text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-text-muted text-sm">
          Loading chart data…
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-text-muted text-sm">
          <span>Chart data unavailable</span>
          <span className="text-xs text-text-muted/60">Yahoo Finance rate-limits historical price data — try again in a few hours</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#8b949e", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#8b949e", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmt(v)}
              width={72}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1c2128",
                border: "1px solid #30363d",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#8b949e" }}
              formatter={(v: number) => [fmt(v), "Value"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#perfGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

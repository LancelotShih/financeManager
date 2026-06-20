import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Holding } from "@/types";

const COLORS = [
  "#7c3aed", "#2563eb", "#0891b2", "#059669", "#65a30d",
  "#ca8a04", "#dc2626", "#9333ea", "#0284c7", "#16a34a",
];

interface Props {
  holdings: Holding[];
}

export default function AllocationChart({ holdings }: Props) {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  const data = holdings
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((h) => ({
      name: h.symbol,
      value: h.value,
      pct: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
    }));

  if (data.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-5 flex items-center justify-center h-72 text-text-muted text-sm">
        No holdings to display
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
        Allocation
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c2128",
              border: "1px solid #30363d",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, _: string, props: { payload?: { pct: number } }) => [
              `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${props.payload?.pct?.toFixed(1)}%)`,
              "",
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: "#8b949e", fontSize: 11 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export default function Sparkline({ data }) {
  // data: array of numbers (prices)
  if (!data || data.length === 0) return null;
  // Format for recharts
  const chartData = data.map((price, idx) => ({ idx, price }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  // Add a small buffer if min == max
  const domain = min === max ? [min - 1, max + 1] : [min, max];
  return (
    <div style={{ width: 110, height: 44, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <YAxis
            type="number"
            domain={domain}
            ticks={[min, max]}
            allowDecimals={true}
            axisLine={false}
            tickLine={false}
            width={38}
            style={{ fontSize: 10 }}
            tickFormatter={v => v.toFixed(2)}
            interval={0}
          />
          <Line type="monotone" dataKey="price" stroke="#1976d2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

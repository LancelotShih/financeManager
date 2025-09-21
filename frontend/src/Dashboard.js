


import React from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

function Card({ title, children }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 18,
      boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
      padding: "2rem 1.5rem 1.5rem 1.5rem",
      marginBottom: "1.5rem",
      minHeight: 480,
      border: "1px solid #f0f0f0",
      overflow: "visible"
    }}>
      <h3 style={{marginTop: 0}}>{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [portfolioTotal, setPortfolioTotal] = React.useState(0);
  const [cashTotal, setCashTotal] = React.useState(0);
  const [treasuryTotal, setTreasuryTotal] = React.useState(0);
  const [retirementTotal, setRetirementTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchTotals() {
      setLoading(true);
      try {
        // Portfolio
        const { getEquities, getStockPrice } = await import("./api");
        const equities = await getEquities();
        let portfolioSum = 0;
        for (const eq of equities) {
          try {
            const res = await getStockPrice(eq.ticker);
            if (res && typeof res.price === "number") {
              portfolioSum += Number(eq.shares) * res.price;
            }
          } catch {}
        }
        setPortfolioTotal(portfolioSum);

        // Cash
        const { getCashAccounts } = await import("./api");
        const cashAccounts = await getCashAccounts();
        const cashSum = cashAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
        setCashTotal(cashSum);

        // Treasuries: fetch from /treasury_summary
        const res = await fetch("http://localhost:8000/treasury_summary");
        let treasurySum = 0;
        if (res.ok) {
          const summary = await res.json();
          treasurySum = summary.reduce((sum, s) => sum + (s.principal || 0), 0);
        }
        setTreasuryTotal(treasurySum);

        // Retirement: sum balances, IRA holdings, and IRA cash
        const { getRetirementAccounts, getIRAHoldings, getIRACash } = await import("./api");
        const retirementAccounts = await getRetirementAccounts();
        let retirementSum = 0;
        for (const acc of retirementAccounts) {
          retirementSum += Number(acc.balance) || 0;
          if (acc.type && acc.type.includes("IRA")) {
            try {
              const holdings = await getIRAHoldings(acc.id);
              for (const h of holdings) {
                if (typeof h.price === "number" && typeof h.shares === "number") {
                  retirementSum += h.price * h.shares;
                } else if (h.symbol && typeof h.shares === "number") {
                  // If price not present, try to fetch
                  try {
                    const { getStockPrice } = await import("./api");
                    const res = await getStockPrice(h.symbol);
                    if (res && typeof res.price === "number") {
                      retirementSum += res.price * h.shares;
                    }
                  } catch {}
                }
              }
              // Add IRA cash
              try {
                const cash = await getIRACash(acc.id);
                if (cash && typeof cash.cash === "number") {
                  retirementSum += cash.cash;
                }
              } catch {}
            } catch {}
          }
        }
        setRetirementTotal(retirementSum);
      } catch (err) {
        // Optionally handle error
      }
      setLoading(false);
    }
    fetchTotals();
  }, []);

  const totalNetWorth = portfolioTotal + cashTotal + treasuryTotal + retirementTotal;

  // Pie chart data
  const pieData = [
    { name: "Portfolio", value: portfolioTotal, fontWeight: '700' },
    { name: "Cash", value: cashTotal, fontWeight: '700'  },
    { name: "Treasuries", value: treasuryTotal, fontWeight: '700'  },
    { name: "Retirement", value: retirementTotal, fontWeight: '700'  },
  ];
  const COLORS = ["#1976d2", "#43a047", "#fbc02d", "#8e24aa"];

  return (
    <div style={{display: "flex", gap: 24, flexWrap: "wrap"}}>
      <Card title="Total Net Worth">
        <div style={{fontSize: 32, fontWeight: 700}}>
          {loading ? "Loading..." : `$${totalNetWorth.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
  <div style={{height: 420, width: 650, minWidth: 350, margin: '32px auto 16px auto', overflow: "visible"}}>
          {loading ? (
            <div>Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 32, right: 32, left: 32, bottom: 32 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={true}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `$${v.toLocaleString(undefined, {maximumFractionDigits: 2})}`} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
      <Card title="Portfolio">
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${portfolioTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
      <Card title="Cash Accounts">
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${cashTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
      <Card title="Treasuries">
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${treasuryTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
      <Card title="Retirement Accounts">
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${retirementTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
    </div>
  );
}

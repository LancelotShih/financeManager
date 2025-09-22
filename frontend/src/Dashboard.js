import React from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getEquitiesWithPrices, getEquitiesWithHistory } from "./api";
import Sparkline from "./Sparkline";

function GrowthBar({ current, yesterday_close }) {
  const change = current - yesterday_close;
  const percent = yesterday_close ? (change / yesterday_close) * 100 : 0;
  const color = change >= 0 ? "#43a047" : "#e53935";
  const width = Math.min(Math.abs(percent), 100); // cap at 100% for display
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120, maxWidth: 120 }}>
      <div
        style={{
          width: `${width}px`,
          height: "10px",
          background: color,
          borderRadius: "4px",
          transition: "width 0.3s"
        }}
        title={`Change: ${percent.toFixed(2)}%`}
      />
      <span style={{ color, fontWeight: 600, fontSize: 13 }}>
        {percent >= 0 ? "+" : ""}{percent.toFixed(2)}%
      </span>
    </div>
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: 18,
      boxShadow: "0 4px 24px 0 rgba(0,0,0,0.40)",
      padding: "2rem 1.5rem 1.5rem 1.5rem",
      marginBottom: "1.5rem",
      border: "1px solid var(--border-main)",
      overflow: "visible",
      color: "var(--text-main)",
      ...style
    }}>
      <h3 style={{marginTop: 0, color: "var(--text-main)"}}>{title}</h3>
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
  const [portfolioHoldings, setPortfolioHoldings] = React.useState([]);
  const [portfolioHistory, setPortfolioHistory] = React.useState([]);
  // Card order state
  const [cardOrder, setCardOrder] = React.useState([
    "Total Net Worth",
    "Portfolio",
    "Cash Accounts",
    "Treasuries",
    "Retirement Accounts"
  ]);

  React.useEffect(() => {
    async function fetchTotals() {
      setLoading(true);
      try {
        // Portfolio with growth
        const holdings = await getEquitiesWithPrices();
        setPortfolioHoldings(holdings);
        // Fetch 5-day history for sparklines
        const history = await getEquitiesWithHistory();
        setPortfolioHistory(history);
        // Debug output
        console.log('holdings', holdings);
        console.log('history', history);

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
        console.error('fetchTotals error', err);
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

  // Card content map
  const cardContent = {
    "Total Net Worth": (
      <Card title="Total Net Worth" style={{ minHeight: 480 }}>
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
    ),
    "Portfolio": (
      <Card title="Portfolio" style={{ minHeight: 480 }}>
        <div style={{fontSize: 24, fontWeight: 600, color: "var(--text-main)"}}>
          {loading ? "Loading..." : `$${portfolioTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
        <div style={{marginTop: 24}}>
          {portfolioHoldings.length === 0 && !loading && <div>No holdings.</div>}
          {portfolioHoldings.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden', color: 'var(--text-main)' }}>
              <thead>
                <tr style={{ background: 'var(--table-header)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 14, borderBottom: '2px solid var(--table-border)', color: 'var(--text-main)' }}>Ticker</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 14, borderBottom: '2px solid var(--table-border)', color: 'var(--text-main)' }}>Shares</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 14, borderBottom: '2px solid var(--table-border)', color: 'var(--text-main)' }}>Growth (GTC)</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 14, borderBottom: '2px solid var(--table-border)', color: 'var(--text-main)' }}>5-Day History</th>
                </tr>
              </thead>
              <tbody>
                {portfolioHoldings.map(h => {
                  const hist = portfolioHistory.find(ph => ph.ticker === h.ticker);
                  return (
                    <tr key={h.ticker} style={{ borderBottom: '1px solid var(--table-border)', background: 'var(--table-row)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{h.ticker}</td>
                      <td style={{ padding: '8px 12px' }}>{h.shares}</td>
                      <td style={{ padding: '8px 12px' }}><GrowthBar current={h.current} yesterday_close={h.yesterday_close} /></td>
                      <td style={{ padding: '8px 12px' }}>
                        {hist && hist.prices && hist.prices.length > 0 && (
                          <Sparkline data={hist.prices} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    ),
    "Cash Accounts": (
      <Card title="Cash Accounts" style={{ minHeight: 40, padding: '1rem 2rem' }}>
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${cashTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
    ),
    "Treasuries": (
      <Card title="Treasuries" style={{ minHeight: 40, padding: '1rem 2rem' }}>
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${treasuryTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
    ),
    "Retirement Accounts": (
      <Card title="Retirement Accounts" style={{ minHeight: 480 }}>
        <div style={{fontSize: 24, fontWeight: 600}}>
          {loading ? "Loading..." : `$${retirementTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
        </div>
      </Card>
    )
  };

  function onDragEnd(result) {
    if (!result.destination) return;
    const newOrder = Array.from(cardOrder);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);
    setCardOrder(newOrder);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="dashboard-cards" direction="horizontal">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} style={{display: "flex", gap: 24, flexWrap: "wrap"}}>
            {cardOrder.map((cardKey, idx) => (
              <Draggable key={cardKey} draggableId={cardKey} index={idx}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.7 : 1,
                      cursor: "grab"
                    }}
                  >
                    {cardContent[cardKey]}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

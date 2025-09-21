
import React from "react";
import { getStockPrice } from "./priceApi";

const RETIREMENT_TYPES = [
  "ROTH IRA",
  "ROTH 401k",
  "Traditional IRA",
  "Traditional 401k"
];

export default function Retirement() {
  // State for accounts
  const [accounts, setAccounts] = React.useState([]);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState(RETIREMENT_TYPES[0]);
  const [balance, setBalance] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");


  // Fetch accounts from backend
  const fetchAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const { getRetirementAccounts } = await import("./api");
      const data = await getRetirementAccounts();
      setAccounts(data);
    } catch (err) {
      setError("Failed to fetch retirement accounts.");
    }
    setLoading(false);
  };

  React.useEffect(() => { fetchAccounts(); }, []);

  // Add account handler
  const handleAddAccount = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    if (!name.trim() || !type) {
      setError("Please enter a valid account name and type.");
      return;
    }
    try {
      const { addRetirementAccount } = await import("./api");
      await addRetirementAccount(name.trim(), type);
      setSuccess("Account added!");
      setName("");
      setType(RETIREMENT_TYPES[0]);
      fetchAccounts();
    } catch (err) {
      setError("Failed to add retirement account.");
    }
  };

  // Delete account handler
  const handleDelete = async (id) => {
    setError("");
    try {
      const { deleteRetirementAccount } = await import("./api");
      await deleteRetirementAccount(id);
      setSuccess("Account deleted!");
      fetchAccounts();
    } catch (err) {
      setError("Failed to delete retirement account.");
    }
  };

  // Expanded state for dropdowns
  const [expanded, setExpanded] = React.useState(null);

  // State for IRA forms and 401k edit
  const [iraForms, setIraForms] = React.useState({}); // { [accountId]: { ticker, shares, cash } }
  const [iraHoldings, setIraHoldings] = React.useState({}); // { [accountId]: [holdings] }
  const [iraPrices, setIraPrices] = React.useState({}); // { [accountId]: { [symbol]: { price, value } } }
  const [iraCash, setIraCash] = React.useState({}); // { [accountId]: cash }
  const [k401Edit, setK401Edit] = React.useState({}); // { [accountId]: value }

  // Fetch IRA holdings and cash when expanded
  React.useEffect(() => {
    if (expanded && accounts.length) {
      const acc = accounts.find(a => a.id === expanded);
      if (acc && acc.type.includes('IRA')) {
        const fetchIra = async () => {
          try {
            const { getIRAHoldings, getIRACash } = await import("./api");
            const holdings = await getIRAHoldings(acc.id);
            setIraHoldings(h => ({ ...h, [acc.id]: holdings }));
            const cash = await getIRACash(acc.id);
            setIraCash(c => ({ ...c, [acc.id]: cash.cash }));
            // Fetch live prices for each holding
            const prices = {};
            await Promise.all(
              holdings.map(async h => {
                try {
                  const res = await getStockPrice(h.symbol);
                  prices[h.symbol] = {
                    price: res.price,
                    value: res.price * h.shares
                  };
                } catch {
                  prices[h.symbol] = { price: null, value: null };
                }
              })
            );
            setIraPrices(p => ({ ...p, [acc.id]: prices }));
          } catch {}
        };
        fetchIra();
      }
      if (acc && acc.type.includes('401k')) {
        setK401Edit(e => ({ ...e, [acc.id]: acc.balance }));
      }
    }
  }, [expanded, accounts]);

  // Handlers for IRA forms
  const handleIraFormChange = (id, field, value) => {
    setIraForms(f => ({ ...f, [id]: { ...f[id], [field]: value } }));
  };
  const handleAddIraEquity = async (id, e) => {
    e.preventDefault();
    const { ticker, shares } = iraForms[id] || {};
    if (!ticker || !shares) return;
    try {
      const { addIRAHolding } = await import("./api");
      await addIRAHolding(id, ticker.trim().toUpperCase(), shares);
      setIraForms(f => ({ ...f, [id]: { ...f[id], ticker: "", shares: "" } }));
      // Refresh holdings
      const { getIRAHoldings } = await import("./api");
      const holdings = await getIRAHoldings(id);
      setIraHoldings(h => ({ ...h, [id]: holdings }));

      // Fetch live prices for each holding (immediately update prices after adding)
      const prices = {};
      await Promise.all(
        holdings.map(async h => {
          try {
            const res = await getStockPrice(h.symbol);
            prices[h.symbol] = {
              price: res.price,
              value: res.price * h.shares
            };
          } catch {
            prices[h.symbol] = { price: null, value: null };
          }
        })
      );
      setIraPrices(p => ({ ...p, [id]: prices }));
    } catch {}
  };
  const handleAddIraCash = async (id, e) => {
    e.preventDefault();
    const { cash } = iraForms[id] || {};
    if (!cash) return;
    try {
      const { addIRACash, getIRACash } = await import("./api");
      await addIRACash(id, cash);
      setIraForms(f => ({ ...f, [id]: { ...f[id], cash: "" } }));
      const res = await getIRACash(id);
      setIraCash(c => ({ ...c, [id]: res.cash }));
      fetchAccounts();
    } catch {}
  };
  const handleDeleteIraHolding = async (id, holdingId) => {
    try {
      const { deleteIRAHolding, getIRAHoldings } = await import("./api");
      await deleteIRAHolding(holdingId);
      const holdings = await getIRAHoldings(id);
      setIraHoldings(h => ({ ...h, [id]: holdings }));
    } catch {}
  };
  // 401k balance edit
  const handleK401Edit = (id, value) => {
    setK401Edit(e => ({ ...e, [id]: value }));
  };
  const handleK401Save = async (id, e) => {
    e.preventDefault();
    try {
      const { setK401Cash, getK401Cash } = await import("./api");
      await setK401Cash(id, Number(k401Edit[id]));
      // Optionally fetch the updated cash value and update local state
      const res = await getK401Cash(id);
      setK401Edit(e => ({ ...e, [id]: res.cash }));
      fetchAccounts();
    } catch {}
  };

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

  return (
    <div style={{maxWidth: 900, margin: "40px auto", padding: '32px 40px', background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #0001"}}>
      <h2>Retirement Accounts</h2>
      <div style={{fontSize: 22, fontWeight: 600, marginBottom: 24, color: '#1976d2'}}>
        Total Retirement Holdings: ${totalBalance.toLocaleString(undefined, {maximumFractionDigits: 2})}
      </div>
      <form onSubmit={handleAddAccount} style={{marginBottom: 32}}>
        <div style={{display: 'flex', gap: 16, marginBottom: 16}}>
          <div style={{flex: 2}}>
            <label>Account Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={{width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: "1px solid #ccc"}} placeholder="e.g. Vanguard Roth IRA" />
          </div>
          <div style={{flex: 1}}>
            <label>Account Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: "1px solid #ccc"}}>
              {RETIREMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" style={{padding: '10px 24px', fontSize: 16, borderRadius: 6, background: "#1976d2", color: "#fff", border: "none"}}>Add Account</button>
        {success && <div style={{color: 'green', marginTop: 16}}>{success}</div>}
        {error && <div style={{color: 'red', marginTop: 16}}>{error}</div>}
      </form>
      <h3>Accounts</h3>
      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 12}}>
        <thead>
          <tr style={{background: '#c0bfbfff'}}>
            <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Account</th>
            <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Type</th>
            <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Balance</th>
            <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Edit</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{color: '#888', textAlign: 'center'}}>Loading...</td></tr>
          ) : accounts.length === 0 ? (
            <tr><td colSpan={4} style={{color: '#888', textAlign: 'center'}}>No retirement accounts yet.</td></tr>
          ) : (
            accounts.map(acc => (
              <React.Fragment key={acc.id}>
                <tr style={{background: '#ffffffff'}}>
                  <td style={{padding: 8, border: '1px solid #eee'}}>{acc.name}</td>
                  <td style={{padding: 8, border: '1px solid #eee'}}>{acc.type}</td>
                  <td style={{padding: 8, border: '1px solid #eee'}}>
                    {`$${acc.balance?.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
                  </td>
                  <td style={{padding: 8, border: '1px solid #eee', cursor: 'pointer', textAlign: 'center'}} onClick={() => setExpanded(expanded === acc.id ? null : acc.id)}>
                    <span style={{fontSize: 22, letterSpacing: 2, userSelect: 'none'}}>⋮</span>
                  </td>
                </tr>
                {expanded === acc.id && (
                  <tr>
                    <td colSpan={4} style={{background: '#f8fafd', border: '1px solid #eee', padding: 16}}>
                      <div style={{display: 'flex', gap: 32}}>
                        {/* 401k Balance Edit */}
                        {acc.type.includes('401k') && (
                          <div style={{flex: 1}}>
                            <strong>Edit 401k Balance</strong>
                            <form style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 8}} onSubmit={e => handleK401Save(acc.id, e)}>
                              <input type="number" value={k401Edit[acc.id] ?? acc.balance} onChange={e => handleK401Edit(acc.id, e.target.value)} style={{width: 120, padding: 6, fontSize: 15, borderRadius: 5, border: '1px solid #ccc'}} />
                              <button style={{padding: '6px 14px', fontSize: 14, borderRadius: 5, background: '#1976d2', color: '#fff', border: 'none'}}>Save</button>
                            </form>
                          </div>
                        )}
                        {/* Add Equity to IRA */}
                        {acc.type.includes('IRA') && (
                          <div style={{flex: 2}}>
                            <strong>Add Equity to IRA</strong>
                            <form style={{display: 'flex', gap: 8, marginTop: 8}} onSubmit={e => handleAddIraEquity(acc.id, e)}>
                              <input type="text" placeholder="Ticker" value={iraForms[acc.id]?.ticker || ""} onChange={e => handleIraFormChange(acc.id, "ticker", e.target.value)} style={{width: 100, padding: 6, fontSize: 15, borderRadius: 5, border: '1px solid #ccc'}} />
                              <input type="number" placeholder="Shares" value={iraForms[acc.id]?.shares || ""} onChange={e => handleIraFormChange(acc.id, "shares", e.target.value)} style={{width: 100, padding: 6, fontSize: 15, borderRadius: 5, border: '1px solid #ccc'}} />
                              <button style={{padding: '6px 14px', fontSize: 14, borderRadius: 5, background: '#1976d2', color: '#fff', border: 'none'}}>Add</button>
                            </form>
                            {/* IRA Holdings Table */}
                            <table style={{width: '100%', marginTop: 12, borderCollapse: 'collapse'}}>
                              <thead>
                                <tr style={{background: '#f5f5f5'}}>
                                  <th style={{padding: 6, border: '1px solid #eee'}}>Ticker</th>
                                  <th style={{padding: 6, border: '1px solid #eee'}}>Shares</th>
                                  <th style={{padding: 6, border: '1px solid #eee'}}>Price</th>
                                  <th style={{padding: 6, border: '1px solid #eee'}}>Value</th>
                                  <th style={{padding: 6, border: '1px solid #eee'}}>Options</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(iraHoldings[acc.id] || []).length === 0 ? (
                                  <tr><td colSpan={5} style={{color: '#888', textAlign: 'center'}}>No holdings</td></tr>
                                ) : (
                                  iraHoldings[acc.id].map(h => {
                                    const priceObj = iraPrices[acc.id]?.[h.symbol] || {};
                                    return (
                                      <tr key={h.id}>
                                        <td style={{padding: 6, border: '1px solid #eee'}}>{h.symbol}</td>
                                        <td style={{padding: 6, border: '1px solid #eee'}}>{h.shares}</td>
                                        <td style={{padding: 6, border: '1px solid #eee'}}>{priceObj.price != null ? `$${priceObj.price.toLocaleString(undefined, {maximumFractionDigits: 2})}` : '-'}</td>
                                        <td style={{padding: 6, border: '1px solid #eee'}}>{priceObj.value != null ? `$${priceObj.value.toLocaleString(undefined, {maximumFractionDigits: 2})}` : '-'}</td>
                                        <td style={{padding: 6, border: '1px solid #eee'}}>
                                          <button onClick={() => handleDeleteIraHolding(acc.id, h.id)} style={{padding: '4px 10px', fontSize: 13, borderRadius: 4, background: '#e53935', color: '#fff', border: 'none'}}>Delete</button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* Add Cash to IRA */}
                        {acc.type.includes('IRA') && (
                          <div style={{flex: 1}}>
                            <strong>Add Cash to IRA</strong>
                            <form style={{display: 'flex', gap: 8, marginTop: 8}} onSubmit={e => handleAddIraCash(acc.id, e)}>
                              <input type="number" placeholder="Amount" value={iraForms[acc.id]?.cash || ""} onChange={e => handleIraFormChange(acc.id, "cash", e.target.value)} style={{width: 100, padding: 6, fontSize: 15, borderRadius: 5, border: '1px solid #ccc'}} />
                              <button style={{padding: '6px 14px', fontSize: 14, borderRadius: 5, background: '#388e3c', color: '#fff', border: 'none'}}>Add</button>
                            </form>
                            <div style={{marginTop: 8, color: '#1976d2', fontWeight: 500}}>
                              IRA Cash Balance: ${iraCash[acc.id]?.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </div>
                          </div>
                        )}
                        {/* Delete button inside dropdown */}
                        <div style={{display: 'flex', alignItems: 'flex-end'}}>
                          <button onClick={() => handleDelete(acc.id)} style={{padding: '6px 18px', fontSize: 15, borderRadius: 5, background: '#e53935', color: '#fff', border: 'none', marginLeft: 24}}>Delete Account</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

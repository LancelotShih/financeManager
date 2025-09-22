import React from "react";

import Dashboard from "./Dashboard";
import Portfolio from "./Portfolio";
import Retirement from "./Retirement";
import Treasuries from "./Treasuries";
export function Page({ page }) {
  if (page === "dashboard") return <Dashboard />;
  if (page === "portfolio") return <Portfolio />;
  if (page === "cash") return <CashAccountMenu />;
  if (page === "treasuries") return <Treasuries />;
  if (page === "retirement") return <Retirement />;
  return <div>Not found</div>;
}
  function CashAccountMenu() {
    const [amount, setAmount] = React.useState("");
    const [type, setType] = React.useState("");
    const [success, setSuccess] = React.useState("");
    const [error, setError] = React.useState("");
    const [accounts, setAccounts] = React.useState([]);
    const [expanded, setExpanded] = React.useState(null);
    const [editState, setEditState] = React.useState({});
    const fetchAccounts = async () => {
      const { getCashAccounts } = await import("./api");
      const data = await getCashAccounts();
      setAccounts(data);
    };
    React.useEffect(() => { fetchAccounts(); }, []);
    const handleSubmit = async (e) => {
      e.preventDefault();
      setSuccess("");
      setError("");
      if (!type.trim() || !amount || isNaN(Number(amount))) {
        setError("Please enter a valid account name and amount.");
        return;
      }
      try {
        const { addCashAccount } = await import("./api");
        await addCashAccount(type.trim(), amount);
        setSuccess("Cash account added!");
        setAmount("");
        setType("");
        fetchAccounts();
      } catch (err) {
        setError("Failed to add cash account.");
      }
    };

    const handleExpand = (name) => {
      setExpanded(expanded === name ? null : name);
      setEditState({});
    };

    const handleEditChange = (field, value) => {
      setEditState(edit => ({ ...edit, [field]: value }));
    };

    const handleSave = async (origName) => {
      setError("");
      try {
        const { updateCashAccount } = await import("./api");
        await updateCashAccount(origName, {
          name: editState.name ?? origName,
          balance: Number(editState.balance)
        });
        setExpanded(null);
        setEditState({});
        fetchAccounts();
      } catch (err) {
        setError("Failed to update cash account.");
      }
    };

    const handleDelete = async (name) => {
      setError("");
      try {
        const { deleteCashAccount } = await import("./api");
        await deleteCashAccount(name);
        fetchAccounts();
      } catch (err) {
        setError("Failed to delete cash account.");
      }
    };

    // Calculate total cash
    const totalCash = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

    return (
      <div style={{maxWidth: 500, margin: "40px auto", padding: 24, background: "var(--bg-card)", borderRadius: 12, boxShadow: "0 2px 12px #0006", color: "var(--text-main)"}}>
        <h2 style={{color: "var(--text-main)"}}>Add to Cash Account</h2>
        <div style={{fontSize: 20, fontWeight: 600, marginBottom: 24, color: '#90caf9'}}>
          Total Cash: ${totalCash.toLocaleString(undefined, {maximumFractionDigits: 2})}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: 16}}>
            <label style={{display: "block", marginBottom: 8}}>Amount to Add</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              style={{width: "100%", padding: 8, fontSize: 16, borderRadius: 6, border: "1px solid var(--border-main)", background: "var(--bg-main)", color: "var(--text-main)"}}
            />
          </div>
          <div style={{marginBottom: 16}}>
            <label style={{display: "block", marginBottom: 8}}>Account Name</label>
            <input
              type="text"
              value={type}
              onChange={e => setType(e.target.value)}
              placeholder="Enter account name (e.g. Checking, Savings, Vacation Fund)"
              style={{width: "100%", padding: 8, fontSize: 16, borderRadius: 6, border: "1px solid var(--border-main)", background: "var(--bg-main)", color: "var(--text-main)"}}
            />
          </div>
          <button type="submit" style={{width: "100%", padding: 10, fontSize: 16, borderRadius: 6, background: "#1976d2", color: "#fff", border: "none"}}>
            Add Money
          </button>
          {success && <div style={{color: 'lightgreen', marginTop: 16}}>{success}</div>}
          {error && <div style={{color: '#ff6b6b', marginTop: 16}}>{error}</div>}
        </form>
        <div style={{marginTop: 32}}>
          <h3 style={{color: "var(--text-main)"}}>Cash Accounts</h3>
          {accounts.length === 0 ? (
            <div style={{color: '#888'}}>No cash accounts yet.</div>
          ) : (
            <ul style={{paddingLeft: 0, listStyle: 'none'}}>
              {accounts.map(acc => {
                const isOpen = expanded === acc.name;
                return (
                  <li key={acc.name} style={{marginBottom: 12, border: '1px solid var(--table-border)', borderRadius: 8, background: 'var(--table-row)', color: 'var(--text-main)'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer'}} onClick={() => handleExpand(acc.name)}>
                      <span><strong>{acc.name}</strong>: ${acc.balance}</span>
                      <span style={{fontSize: 18}}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {isOpen && (
                      <div style={{padding: '16px 16px 8px 16px', borderTop: '1px solid var(--table-border)'}}>
                        <div style={{marginBottom: 12}}>
                          <label style={{display: 'block', marginBottom: 6}}>Account Name</label>
                          <input
                            type="text"
                            value={editState.name !== undefined ? editState.name : acc.name}
                            onChange={e => handleEditChange('name', e.target.value)}
                            style={{width: '100%', padding: 8, fontSize: 15, borderRadius: 5, border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-main)'}}
                          />
                        </div>
                        <div style={{marginBottom: 12}}>
                          <label style={{display: 'block', marginBottom: 6}}>Balance</label>
                          <input
                            type="number"
                            value={editState.balance !== undefined ? editState.balance : acc.balance}
                            onChange={e => handleEditChange('balance', e.target.value)}
                            style={{width: '100%', padding: 8, fontSize: 15, borderRadius: 5, border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-main)'}}
                          />
                        </div>
                        <div style={{display: 'flex', gap: 12}}>
                          <button type="button" onClick={() => handleSave(acc.name)} style={{padding: '8px 18px', fontSize: 15, borderRadius: 5, background: '#1976d2', color: '#fff', border: 'none'}}>Save</button>
                          <button type="button" onClick={() => handleDelete(acc.name)} style={{padding: '8px 18px', fontSize: 15, borderRadius: 5, background: '#e53935', color: '#fff', border: 'none'}}>Delete</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

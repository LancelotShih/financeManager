import React from "react";

const TREASURY_TYPES = [
  "Treasury Bill",
  "Treasury Note",
  "Treasury Bond",
  "TIPS Note",
  "TIPS Bond",
  "Floating Rate Note (FRN)",
  "Series EE Savings Bond",
  "Series I Savings Bond",
  "C of I Certificate"
];

export default function Treasuries() {
  // Removed add-cash form state
  const [summary, setSummary] = React.useState([]);
  // Calculate total value of all treasuries
  const totalValue = summary.reduce((sum, s) => sum + (s.principal || 0), 0);
  const [success, setSuccess] = React.useState("");
  const [error, setError] = React.useState("");
  const [editType, setEditType] = React.useState(null);
  const [editValue, setEditValue] = React.useState("");
  const [deletingType, setDeletingType] = React.useState(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch("http://localhost:8000/treasury_summary");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data);
    } catch {
      setSummary([]);
    }
  };

  React.useEffect(() => { fetchSummary(); }, []);

  // Removed add-cash form handler

  // No yield editing in simple UI

  // Edit handler
  const handleEdit = (t, value) => {
    setEditType(t);
    setEditValue(value);
    setError("");
    setSuccess("");
  };
  const handleEditSave = async (t) => {
    if (!editValue || isNaN(Number(editValue)) || Number(editValue) < 0) {
      setError("Enter a valid amount"); return;
    }
    try {
      await fetch("http://localhost:8000/treasury_edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: t, amount: Number(editValue) })
      });
      setSuccess("Updated cash for " + t);
      setEditType(null);
      fetchSummary();
    } catch {
      setError("Failed to update cash");
    }
  };
  // Delete handler
  const handleDelete = async (t) => {
    setDeletingType(t);
    setError(""); setSuccess("");
    try {
      await fetch(`http://localhost:8000/treasury_delete/${encodeURIComponent(t)}`, { method: "DELETE" });
      setSuccess("Deleted cash for " + t);
      setDeletingType(null);
      fetchSummary();
    } catch {
      setError("Failed to delete cash");
      setDeletingType(null);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: '32px 40px', background: "var(--bg-card)", borderRadius: 12, boxShadow: "0 2px 12px #0006", color: "var(--text-main)" }}>
      <h2 style={{color: "var(--text-main)"}}>Treasuries</h2>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18, color: '#90caf9' }}>
        Total Value: ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      {/* Add-cash form removed as requested */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, background: 'var(--bg-card)', color: 'var(--text-main)' }}>
        <thead>
          <tr style={{ background: 'var(--table-header)' }}>
            <th style={{ padding: 8, border: '1px solid var(--table-border)', textAlign: 'left' }}>Type</th>
            <th style={{ padding: 8, border: '1px solid var(--table-border)', textAlign: 'left' }}>Total Cash ($)</th>
            <th style={{ padding: 8, border: '1px solid var(--table-border)', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {TREASURY_TYPES.map(t => {
            const row = summary.find(s => s.type === t) || { principal: 0 };
            return (
              <tr key={t} style={{background: 'var(--table-row)'}}>
                <td style={{ fontWeight: 600, padding: 8, border: '1px solid var(--table-border)' }}>{t}</td>
                <td style={{ padding: 8, border: '1px solid var(--table-border)' }}>
                  {editType === t ? (
                    <input
                      type="number"
                      value={editValue}
                      min="0"
                      onChange={e => setEditValue(e.target.value)}
                      style={{ width: 100, fontSize: 14, borderRadius: 4, border: '1px solid var(--border-main)', padding: 2, background: 'var(--bg-main)', color: 'var(--text-main)' }}
                    />
                  ) : (
                    `$${row.principal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  )}
                </td>
                <td style={{ padding: 8, border: '1px solid var(--table-border)' }}>
                  {editType === t ? (
                    <>
                      <button onClick={() => handleEditSave(t)} style={{ color: '#fff', background: '#1976d2', border: 'none', borderRadius: 4, padding: '2px 10px', fontSize: 13, marginRight: 4 }}>Save</button>
                      <button onClick={() => setEditType(null)} style={{ color: '#333', background: '#eee', border: 'none', borderRadius: 4, padding: '2px 10px', fontSize: 13 }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(t, row.principal)} style={{ color: '#1976d2', background: 'none', border: 'none', fontSize: 13, marginRight: 8, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(t)} disabled={deletingType === t} style={{ color: '#fff', background: '#d32f2f', border: 'none', borderRadius: 4, padding: '2px 10px', fontSize: 13, cursor: 'pointer' }}>
                        {deletingType === t ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {success && <div style={{ color: 'lightgreen', marginTop: 16 }}>{success}</div>}
      {error && <div style={{ color: '#ff6b6b', marginTop: 16 }}>{error}</div>}
    </div>
  );
}


// No LotsPanel needed in simple UI

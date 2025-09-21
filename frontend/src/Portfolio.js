
import React from "react";


function PortfolioEquityMenu() {
  const [ticker, setTicker] = React.useState("");
  const [shares, setShares] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [error, setError] = React.useState("");
  const [equities, setEquities] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [editState, setEditState] = React.useState({});
  const [prices, setPrices] = React.useState({});
  const [tickerSuggestions, setTickerSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  // Fetch prices for all equities
  React.useEffect(() => {
    const fetchPrices = async () => {
      if (equities.length === 0) return;
      const { getStockPrice } = await import("./api");
      const newPrices = {};
      for (const eq of equities) {
        try {
          const res = await getStockPrice(eq.ticker);
          newPrices[eq.ticker] = res.price;
        } catch {
          newPrices[eq.ticker] = null;
        }
      }
      setPrices(newPrices);
    };
    fetchPrices();
  }, [equities]);

  const fetchEquities = async () => {
    setLoading(true);
    setError("");
    try {
      const { getEquities } = await import("./api");
      const data = await getEquities();
      setEquities(data);
    } catch (err) {
      setError("Failed to fetch equities.");
    }
    setLoading(false);
  };

  React.useEffect(() => { fetchEquities(); }, []);

  // Autocomplete ticker search
  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (ticker.trim().length < 2) {
        setTickerSuggestions([]);
        return;
      }
      try {
        const { searchTickers } = await import("./api");
        const results = await searchTickers(ticker.trim());
        setTickerSuggestions(results);
      } catch {
        setTickerSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [ticker]);

  const handleSuggestionClick = (symbol) => {
    setTicker(symbol);
    setShowSuggestions(false);
  };

  const handleTickerChange = (e) => {
    setTicker(e.target.value);
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    // Delay hiding to allow click
    setTimeout(() => setShowSuggestions(false), 120);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    if (!ticker.trim() || !shares || isNaN(Number(shares)) || Number(shares) <= 0) {
      setError("Please enter a valid ticker and number of shares.");
      return;
    }
    try {
      const { addEquity } = await import("./api");
      await addEquity(ticker.trim().toUpperCase(), shares);
      setSuccess(`Added ${shares} shares of ${ticker.toUpperCase()}`);
      setTicker("");
      setShares("");
      fetchEquities();
    } catch (err) {
      setError("Failed to add equity.");
    }
  };

  // ...existing code...
  const handleEditChange = (ticker, value) => {
    setEditState(edit => ({ ...edit, [ticker]: value }));
  };

  const handleSave = async (ticker) => {
    setError("");
    try {
      const { updateEquity } = await import("./api");
      await updateEquity(ticker, editState[ticker]);
      setSuccess(`Updated ${ticker} to ${editState[ticker]} shares`);
      setEditState(edit => ({ ...edit, [ticker]: undefined }));
      fetchEquities();
    } catch (err) {
      setError("Failed to update equity.");
    }
  };

  const handleDelete = async (ticker) => {
    setError("");
    try {
      const { deleteEquity } = await import("./api");
      await deleteEquity(ticker);
      setSuccess(`Deleted ${ticker}`);
      setEditState(edit => ({ ...edit, [ticker]: undefined }));
      fetchEquities();
    } catch (err) {
      setError("Failed to delete equity.");
    }
  };

  return (
  <div style={{maxWidth: 1000, margin: "40px auto", padding: '32px 40px', background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #0001"}}>
      <h2>Add Equity</h2>
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom: 16, position: 'relative'}}>
          <label style={{display: "block", marginBottom: 8}}>Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={handleTickerChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder="e.g. AAPL, TSLA"
            autoComplete="off"
            style={{width: "100%", padding: 8, fontSize: 16, borderRadius: 6, border: "1px solid #ccc"}}
          />
          {showSuggestions && tickerSuggestions.length > 0 && (
            <ul style={{position: 'absolute', left: 0, right: 0, top: 54, zIndex: 10, background: '#fff', border: '1px solid #ccc', borderRadius: 6, maxHeight: 220, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none', boxShadow: '0 2px 8px #0002'}}>
              {tickerSuggestions.map(sug => (
                <li
                  key={sug.symbol}
                  onMouseDown={() => handleSuggestionClick(sug.symbol)}
                  style={{padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #eee'}}
                >
                  <span style={{fontWeight: 600}}>{sug.symbol}</span>
                  <span style={{color: '#888', marginLeft: 10}}>{sug.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{marginBottom: 16}}>
          <label style={{display: "block", marginBottom: 8}}>Number of Shares</label>
          <input
            type="number"
            value={shares}
            onChange={e => setShares(e.target.value)}
            placeholder="Enter shares"
            style={{width: "100%", padding: 8, fontSize: 16, borderRadius: 6, border: "1px solid #ccc"}}
          />
        </div>
        <button type="submit" style={{width: "100%", padding: 10, fontSize: 16, borderRadius: 6, background: "#1976d2", color: "#fff", border: "none"}}>
          Add Equity
        </button>
        {success && <div style={{color: 'green', marginTop: 16}}>{success}</div>}
        {error && <div style={{color: 'red', marginTop: 16}}>{error}</div>}
      </form>
      <div style={{marginTop: 32}}>
        <h3>Portfolio Holdings</h3>
        <div style={{fontSize: 20, fontWeight: 600, marginBottom: 24, color: '#1976d2'}}>
            {
                (() => {
                    let totalValue = 0;
                    equities.forEach(eq => {
                    const sharesVal = editState[eq.ticker] !== undefined ? Number(editState[eq.ticker]) : Number(eq.shares);
                    const priceVal = prices[eq.ticker];
                    if (priceVal !== undefined && priceVal !== null && !isNaN(sharesVal)) {
                        totalValue += sharesVal * priceVal;
                    }
                    });
                    return `Portfolio Value: $${totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
                })()
            }
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : equities.length === 0 ? (
          <div style={{color: '#888'}}>No equities in portfolio yet.</div>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 12}}>
            <thead>
              <tr style={{background: '#f5f5f5'}}>
                <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Ticker</th>
                <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Share Amount</th>
                <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Share Price</th>
                <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Total Standing Value</th>
                <th style={{padding: 8, border: '1px solid #eee', textAlign: 'left'}}>Options</th>
              </tr>
            </thead>
            <tbody>
              {equities.map(eq => {
                const sharesVal = editState[eq.ticker] !== undefined ? Number(editState[eq.ticker]) : Number(eq.shares);
                const priceVal = prices[eq.ticker];
                const total = priceVal && !isNaN(sharesVal) ? sharesVal * priceVal : null;
                return (
                  <tr key={eq.ticker} style={{background: '#fafbfc'}}>
                    <td style={{padding: 8, border: '1px solid #eee'}}><strong>{eq.ticker}</strong></td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>
                      <input
                        type="number"
                        value={editState[eq.ticker] !== undefined ? editState[eq.ticker] : eq.shares}
                        onChange={e => handleEditChange(eq.ticker, e.target.value)}
                        style={{width: 80, padding: 6, fontSize: 15, borderRadius: 5, border: '1px solid #ccc'}}
                        min="0"
                      />
                    </td>
                    <td style={{padding: 8, border: '1px solid #eee', color: '#1976d2', fontWeight: 500}}>
                      {priceVal === undefined ? '...' : priceVal === null ? 'N/A' : `$${priceVal.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
                    </td>
                    <td style={{padding: 8, border: '1px solid #eee', color: '#388e3c', fontWeight: 600}}>
                      {total === null ? '' : `$${total.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
                    </td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>
                      <button type="button" onClick={() => handleSave(eq.ticker)} style={{padding: '6px 14px', fontSize: 14, borderRadius: 5, background: '#1976d2', color: '#fff', border: 'none', marginRight: 8}}>Save</button>
                      <button type="button" onClick={() => handleDelete(eq.ticker)} style={{padding: '6px 14px', fontSize: 14, borderRadius: 5, background: '#e53935', color: '#fff', border: 'none'}}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {/* Total Portfolio Value Row */}
              
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Portfolio() {
  return (
    <div>
      <PortfolioEquityMenu />
    </div>
  );
}


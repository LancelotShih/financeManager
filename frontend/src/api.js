// --- 401k Cash API ---
export async function getK401Cash(accountId) {
  const res = await fetch(`${API_BASE}/k401_cash/${accountId}`);
  if (!res.ok) throw new Error("Failed to fetch 401k cash");
  return res.json();
}

export async function addK401Cash(accountId, amount) {
  const res = await fetch(`${API_BASE}/k401_cash/${accountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Number(amount) })
  });
  if (!res.ok) throw new Error("Failed to add 401k cash");
  return res.json();
}

export async function setK401Cash(accountId, amount) {
  const res = await fetch(`${API_BASE}/k401_cash/${accountId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Number(amount) })
  });
  if (!res.ok) throw new Error("Failed to set 401k cash");
  return res.json();
}
// --- IRA Holdings API ---
export async function getIRAHoldings(accountId) {
  const res = await fetch(`${API_BASE}/ira/${accountId}`);
  if (!res.ok) throw new Error("Failed to fetch IRA holdings");
  return res.json();
}

export async function addIRAHolding(accountId, symbol, shares) {
  const res = await fetch(`${API_BASE}/ira/${accountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: accountId, symbol, shares: Number(shares) })
  });
  if (!res.ok) throw new Error("Failed to add IRA holding");
  return res.json();
}

export async function updateIRAHolding(holdingId, symbol, shares) {
  const res = await fetch(`${API_BASE}/ira/${holdingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, shares: Number(shares) })
  });
  if (!res.ok) throw new Error("Failed to update IRA holding");
  return res.json();
}

export async function deleteIRAHolding(holdingId) {
  const res = await fetch(`${API_BASE}/ira/${holdingId}`, {
    method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete IRA holding");
  return res.json();
}

// --- IRA Cash API ---
export async function getIRACash(accountId) {
  const res = await fetch(`${API_BASE}/ira_cash/${accountId}`);
  if (!res.ok) throw new Error("Failed to fetch IRA cash");
  return res.json();
}

export async function addIRACash(accountId, amount) {
  const res = await fetch(`${API_BASE}/ira_cash/${accountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Number(amount) })
  });
  if (!res.ok) throw new Error("Failed to add IRA cash");
  return res.json();
}

export async function setIRACash(accountId, amount) {
  const res = await fetch(`${API_BASE}/ira_cash/${accountId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Number(amount) })
  });
  if (!res.ok) throw new Error("Failed to set IRA cash");
  return res.json();
}
// --- Retirement Accounts API ---
export async function addRetirementAccount(name, type) {
  const res = await fetch(`${API_BASE}/retirement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type })
  });
  if (!res.ok) throw new Error("Failed to add retirement account");
  return res.json();
}

export async function deleteRetirementAccount(id) {
  const res = await fetch(`${API_BASE}/retirement/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete retirement account");
  return res.json();
}

export async function updateRetirementAccount(id, name, type) {
  const res = await fetch(`${API_BASE}/retirement/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type })
  });
  if (!res.ok) throw new Error("Failed to update retirement account");
  return res.json();
}
export async function searchTickers(query) {
  const res = await fetch(`${API_BASE}/tickers/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to fetch ticker suggestions");
  return res.json();
}
export async function getStockPrice(ticker) {
  const res = await fetch(`${API_BASE}/price/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error("Failed to fetch price");
  return res.json();
}
export async function updateEquity(ticker, shares) {
  const res = await fetch(`${API_BASE}/equities/${encodeURIComponent(ticker)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, shares: Number(shares) })
  });
  if (!res.ok) throw new Error("Failed to update equity");
  return res.json();
}

export async function deleteEquity(ticker) {
  const res = await fetch(`${API_BASE}/equities/${encodeURIComponent(ticker)}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete equity");
  return res.json();
}
// --- Equities API ---
export async function getEquities() {
  const res = await fetch(`${API_BASE}/equities`);
  if (!res.ok) throw new Error("Failed to fetch equities");
  return res.json();
}

export async function addEquity(ticker, shares) {
  const res = await fetch(`${API_BASE}/equities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, shares: Number(shares) })
  });
  if (!res.ok) throw new Error("Failed to add equity");
  return res.json();
}
export async function updateCashAccount(name, account) {
  const res = await fetch(`${API_BASE}/cash/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account)
  });
  if (!res.ok) throw new Error("Failed to update cash account");
  return res.json();
}

export async function deleteCashAccount(name) {
  const res = await fetch(`${API_BASE}/cash/${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete cash account");
  return res.json();
}

// Simple API service for backend requests
const API_BASE = "http://localhost:8000";

export async function addCashAccount(name, balance) {
  const res = await fetch(`${API_BASE}/cash`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, balance: Number(balance) })
  });
  if (!res.ok) throw new Error("Failed to add cash account");
  return res.json();
}

export async function getStocks() {
  const res = await fetch(`${API_BASE}/stocks`);
  return res.json();
}

export async function getCashAccounts() {
  const res = await fetch(`${API_BASE}/cash`);
  return res.json();
}

export async function getTreasuries() {
  const res = await fetch(`${API_BASE}/treasuries`);
  return res.json();
}

export async function getRetirementAccounts() {
  const res = await fetch(`${API_BASE}/retirement`);
  return res.json();
}

export async function getEquitiesWithPrices() {
  const res = await fetch(`${API_BASE}/equities/prices`);
  if (!res.ok) throw new Error("Failed to fetch equities with prices");
  return res.json();
}

export async function getEquitiesWithHistory() {
  const res = await fetch(`${API_BASE}/equities/history`);
  if (!res.ok) throw new Error("Failed to fetch equities with history");
  return res.json();
}

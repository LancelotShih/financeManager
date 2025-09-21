// Fetch live price for a ticker using backend endpoint
export async function getStockPrice(ticker) {
  const res = await fetch(`http://localhost:8000/price/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error("Failed to fetch price");
  return res.json();
}

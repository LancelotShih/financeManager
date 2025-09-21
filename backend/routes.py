# --- Ticker Autocomplete ---
import json
import os

# --- IRA Cash Balances ---
from fastapi import Body, Request
from fastapi import APIRouter, HTTPException
from db import get_db
from models import CashAccount, RetirementAccount, IRAHolding, Equity
from models import TreasuryLot, TreasuryYield
from typing import List
import yfinance as yf

router = APIRouter()

# Place these endpoints after router is defined

# Delete all cash for a treasury type
@router.delete("/treasury_delete/{type}")
def delete_treasury_type(type: str):
    conn = get_db()
    conn.execute("DELETE FROM treasury_lots WHERE type = ?", (type,))
    conn.commit()
    return {"ok": True}

# Edit/set total cash for a treasury type (removes all lots, inserts one lot with new amount)
@router.put("/treasury_edit")
async def edit_treasury_type(request: Request):
    data = await request.json()
    t = data.get("type")
    amount = data.get("amount")
    if not t or amount is None:
        raise HTTPException(status_code=400, detail="type and amount required")
    conn = get_db()
    conn.execute("DELETE FROM treasury_lots WHERE type = ?", (t,))
    if amount > 0:
        import datetime
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        conn.execute("INSERT INTO treasury_lots (type, amount, purchase_date) VALUES (?, ?, ?)", (t, amount, today))
    conn.commit()
    return {"ok": True}
# --- Treasuries (lots-based) ---

# Add a new cash lot to a treasury type
@router.post("/treasury_lots", response_model=TreasuryLot)
def add_treasury_lot(lot: TreasuryLot):
    conn = get_db()
    c = conn.execute(
        "INSERT INTO treasury_lots (type, amount, purchase_date) VALUES (?, ?, ?)",
        (lot.type, lot.amount, lot.purchase_date)
    )
    conn.commit()
    lot.id = c.lastrowid
    return lot

# Get all treasury lots
@router.get("/treasury_lots", response_model=List[TreasuryLot])
def get_treasury_lots():
    conn = get_db()
    rows = conn.execute("SELECT id, type, amount, purchase_date FROM treasury_lots").fetchall()
    return [TreasuryLot(id=row["id"], type=row["type"], amount=row["amount"], purchase_date=row["purchase_date"]) for row in rows]

# Set or update yield for a treasury type
@router.put("/treasury_yields/{type}", response_model=TreasuryYield)
def set_treasury_yield(type: str, yield_obj: TreasuryYield):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO treasury_yields (type, interest_rate) VALUES (?, ?)",
        (type, yield_obj.interest_rate)
    )
    conn.commit()
    return yield_obj

# Get all yields
@router.get("/treasury_yields", response_model=List[TreasuryYield])
def get_treasury_yields():
    conn = get_db()
    rows = conn.execute("SELECT type, interest_rate FROM treasury_yields").fetchall()
    return [TreasuryYield(type=row["type"], interest_rate=row["interest_rate"]) for row in rows]

# Get summary by type (principal, yield, and for Series I, calculated value)
@router.get("/treasury_summary")
def get_treasury_summary():
    import datetime
    conn = get_db()
    lots = conn.execute("SELECT type, amount, purchase_date FROM treasury_lots").fetchall()
    yields = {row["type"]: row["interest_rate"] for row in conn.execute("SELECT type, interest_rate FROM treasury_yields").fetchall()}
    summary = {}
    for lot in lots:
        t = lot["type"]
        amt = lot["amount"]
        pd = lot["purchase_date"]
        if t not in summary:
            summary[t] = {"principal": 0, "lots": [], "yield": yields.get(t, 0), "current_value": 0}
        summary[t]["principal"] += amt
        summary[t]["lots"].append({"amount": amt, "purchase_date": pd})
    # Calculate current value for Series I
    for t, s in summary.items():
        if t == "Series I Savings Bond":
            total = 0
            rate = s["yield"] / 100.0
            for lot in s["lots"]:
                principal = lot["amount"]
                try:
                    purchase_date = datetime.datetime.strptime(lot["purchase_date"], "%Y-%m-%d")
                    now = datetime.datetime.now()
                    months = (now.year - purchase_date.year) * 12 + (now.month - purchase_date.month)
                    n_periods = months // 6
                    value = principal
                    for _ in range(n_periods):
                        value += value * (rate / 2)
                    total += value
                except Exception:
                    total += principal
            s["current_value"] = round(total, 2)
        else:
            s["current_value"] = s["principal"]
    # Format summary for frontend
    return [
        {
            "type": t,
            "principal": s["principal"],
            "yield": s["yield"],
            "current_value": s["current_value"],
            "lots": s["lots"]
        }
        for t, s in summary.items()
    ]
# --- 401k Cash Balances ---

@router.get("/k401_cash/{account_id}")
def get_k401_cash(account_id: int):
    conn = get_db()
    row = conn.execute("SELECT balance FROM retirement_accounts WHERE id = ?", (account_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="401k account not found")
    return {"account_id": account_id, "cash": row["balance"]}

@router.post("/k401_cash/{account_id}")
def add_k401_cash(account_id: int, amount: float = Body(..., embed=True)):
    conn = get_db()
    row = conn.execute("SELECT type FROM retirement_accounts WHERE id = ?", (account_id,)).fetchone()
    if not row or "401k" not in row["type"]:
        raise HTTPException(status_code=400, detail="Not a 401k account")
    conn.execute("UPDATE retirement_accounts SET balance = balance + ? WHERE id = ?", (amount, account_id))
    conn.commit()
    return {"ok": True}

@router.put("/k401_cash/{account_id}")
def set_k401_cash(account_id: int, amount: float = Body(..., embed=True)):
    conn = get_db()
    row = conn.execute("SELECT type FROM retirement_accounts WHERE id = ?", (account_id,)).fetchone()
    if not row or "401k" not in row["type"]:
        raise HTTPException(status_code=400, detail="Not a 401k account")
    conn.execute("UPDATE retirement_accounts SET balance = ? WHERE id = ?", (amount, account_id))
    conn.commit()
    return {"ok": True}

@router.get("/ira_cash/{account_id}")
def get_ira_cash(account_id: int):
    conn = get_db()
    row = conn.execute("SELECT balance FROM retirement_accounts WHERE id = ?", (account_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="IRA account not found")
    return {"account_id": account_id, "cash": row["balance"]}

@router.post("/ira_cash/{account_id}")
def add_ira_cash(account_id: int, amount: float = Body(..., embed=True)):
    conn = get_db()
    row = conn.execute("SELECT type FROM retirement_accounts WHERE id = ?", (account_id,)).fetchone()
    if not row or "IRA" not in row["type"]:
        raise HTTPException(status_code=400, detail="Not an IRA account")
    conn.execute("UPDATE retirement_accounts SET balance = balance + ? WHERE id = ?", (amount, account_id))
    conn.commit()
    return {"ok": True}

@router.put("/ira_cash/{account_id}")
def set_ira_cash(account_id: int, amount: float = Body(..., embed=True)):
    conn = get_db()
    row = conn.execute("SELECT type FROM retirement_accounts WHERE id = ?", (account_id,)).fetchone()
    if not row or "IRA" not in row["type"]:
        raise HTTPException(status_code=400, detail="Not an IRA account")
    conn.execute("UPDATE retirement_accounts SET balance = ? WHERE id = ?", (amount, account_id))
    conn.commit()
    return {"ok": True}

@router.get("/tickers/search")
def search_tickers(q: str):
    # For demo: load from static file. In production, use a real database or API.
    tickers_path = os.path.join(os.path.dirname(__file__), "tickers_sample.json")
    with open(tickers_path, "r", encoding="utf-8") as f:
        tickers = json.load(f)
    q_lower = q.strip().lower()
    results = [t for t in tickers if q_lower in t["symbol"].lower() or q_lower in t["name"].lower()]
    return results[:10]

# --- Stock Price ---
@router.get("/price/{ticker}")
def get_stock_price(ticker: str):
    import logging
    # Clean ticker: strip, uppercase, remove common suffixes
    clean_ticker = ticker.strip().upper()
    for suffix in [".US", "/USD"]:
        if clean_ticker.endswith(suffix):
            clean_ticker = clean_ticker[: -len(suffix)]
    ticker_obj = yf.Ticker(clean_ticker)
    price = None
    logging.info(f"Fetching price for {clean_ticker}")
    try:
        price = ticker_obj.fast_info['last_price']
    except Exception:
        # fallback if fast_info fails
        hist = ticker_obj.history(period="1d")
        if not hist.empty:
            price = hist['Close'].iloc[-1]
    if price is not None:
        return {"ticker": clean_ticker, "price": float(price)}
    else:
        logging.warning(f"Failed to fetch price for {clean_ticker} using yfinance.")
        raise HTTPException(status_code=404, detail=f"Price not found for ticker {clean_ticker}")

# --- Equities ---
@router.get("/equities", response_model=List[Equity])
def get_equities():
    conn = get_db()
    rows = conn.execute("SELECT ticker, shares FROM equities").fetchall()
    return [Equity(ticker=row["ticker"], shares=row["shares"]) for row in rows]


@router.post("/equities", response_model=Equity)
def add_equity(equity: Equity):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO equities (ticker, shares) VALUES (?, ?)", (equity.ticker.upper(), equity.shares))
    conn.commit()
    return equity

@router.put("/equities/{ticker}", response_model=Equity)
def update_equity(ticker: str, equity: Equity):
    conn = get_db()
    result = conn.execute("UPDATE equities SET shares = ? WHERE ticker = ?", (equity.shares, ticker.upper()))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Equity not found")
    conn.commit()
    return equity

@router.delete("/equities/{ticker}")
def delete_equity(ticker: str):
    conn = get_db()
    result = conn.execute("DELETE FROM equities WHERE ticker = ?", (ticker.upper(),))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Equity not found")
    conn.commit()
    return {"ok": True}

# --- Cash Accounts ---
@router.get("/cash", response_model=List[CashAccount])
def get_cash_accounts():
    conn = get_db()
    rows = conn.execute("SELECT name, balance FROM cash_accounts").fetchall()
    return [CashAccount(name=row["name"], balance=row["balance"]) for row in rows]

@router.post("/cash", response_model=CashAccount)
def add_cash_account(account: CashAccount):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO cash_accounts (name, balance) VALUES (?, ?)", (account.name, account.balance))
    conn.commit()
    return account

@router.put("/cash/{name}", response_model=CashAccount)
def update_cash_account(name: str, account: CashAccount):
    conn = get_db()
    result = conn.execute("UPDATE cash_accounts SET balance = ? WHERE name = ?", (account.balance, name))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Cash account not found")
    conn.commit()
    return account

@router.delete("/cash/{name}")
def delete_cash_account(name: str):
    conn = get_db()
    result = conn.execute("DELETE FROM cash_accounts WHERE name = ?", (name,))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Cash account not found")
    conn.commit()
    return {"ok": True}


# --- Retirement Accounts ---

# Enhanced: For IRA accounts, sum cash + live value of holdings
@router.get("/retirement", response_model=List[RetirementAccount])
def get_retirement_accounts():
    conn = get_db()
    rows = conn.execute("SELECT id, name, type, balance FROM retirement_accounts").fetchall()
    accounts = []
    for row in rows:
        acc_id = row["id"]
        acc_type = row["type"]
        cash = row["balance"]
        # If IRA, sum holdings value + cash
        if "IRA" in acc_type:
            holdings = conn.execute("SELECT symbol, shares FROM ira_holdings WHERE account_id = ?", (acc_id,)).fetchall()
            total_value = cash
            for h in holdings:
                symbol = h["symbol"].strip().upper()
                shares = h["shares"]
                try:
                    ticker_obj = yf.Ticker(symbol)
                    price = None
                    try:
                        price = ticker_obj.fast_info['last_price']
                    except Exception:
                        hist = ticker_obj.history(period="1d")
                        if not hist.empty:
                            price = hist['Close'].iloc[-1]
                    if price is not None:
                        total_value += float(price) * float(shares)
                except Exception:
                    pass  # If price fetch fails, skip
            accounts.append(RetirementAccount(id=acc_id, name=row["name"], type=acc_type, balance=total_value))
        else:
            accounts.append(RetirementAccount(id=acc_id, name=row["name"], type=acc_type, balance=cash))
    return accounts

@router.post("/retirement", response_model=RetirementAccount)
def add_retirement_account(account: RetirementAccount):
    conn = get_db()
    c = conn.execute("INSERT INTO retirement_accounts (name, type, balance) VALUES (?, ?, ?)", (account.name, account.type, account.balance))
    conn.commit()
    account.id = c.lastrowid
    return account

@router.put("/retirement/{id}", response_model=RetirementAccount)
def update_retirement_account(id: int, account: RetirementAccount):
    conn = get_db()
    result = conn.execute("UPDATE retirement_accounts SET name = ?, type = ?, balance = ? WHERE id = ?",
                         (account.name, account.type, account.balance, id))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Retirement account not found")
    conn.commit()
    return account

@router.delete("/retirement/{id}")
def delete_retirement_account(id: int):
    conn = get_db()
    result = conn.execute("DELETE FROM retirement_accounts WHERE id = ?", (id,))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Retirement account not found")
    conn.commit()
    return {"ok": True}

# --- IRA Holdings ---
@router.get("/ira/{account_id}", response_model=List[IRAHolding])
def get_ira_holdings(account_id: int):
    conn = get_db()
    rows = conn.execute("SELECT id, account_id, symbol, shares FROM ira_holdings WHERE account_id = ?", (account_id,)).fetchall()
    return [IRAHolding(id=row["id"], account_id=row["account_id"], symbol=row["symbol"], shares=row["shares"]) for row in rows]

@router.post("/ira/{account_id}", response_model=IRAHolding)
def add_ira_holding(account_id: int, holding: IRAHolding):
    conn = get_db()
    c = conn.execute("INSERT INTO ira_holdings (account_id, symbol, shares) VALUES (?, ?, ?)", (account_id, holding.symbol, holding.shares))
    conn.commit()
    holding.id = c.lastrowid
    return holding

@router.put("/ira/{holding_id}", response_model=IRAHolding)
def update_ira_holding(holding_id: int, holding: IRAHolding):
    conn = get_db()
    result = conn.execute("UPDATE ira_holdings SET symbol = ?, shares = ? WHERE id = ?",
                         (holding.symbol, holding.shares, holding_id))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="IRA holding not found")
    conn.commit()
    return holding

@router.delete("/ira/{holding_id}")
def delete_ira_holding(holding_id: int):
    conn = get_db()
    result = conn.execute("DELETE FROM ira_holdings WHERE id = ?", (holding_id,))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="IRA holding not found")
    conn.commit()
    return {"ok": True}

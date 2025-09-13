import random
import constants
from treasury import calculate_current_value
from constants import RETIREMENT_ACCOUNTS
from retirement import get_ira_value, update_ira_stock_price

# If you want to test real API later
import yfinance as yf

# --- Configuration ---
USE_MOCK = False  # True = use mock prices, False = use real API

# --- Mock base prices ---
MOCK_BASE_PRICES = {
    "GOOGL" : 140.0,
    "SPY": 657,
    "NVDA": 177.82,
    "META": 755.59,
    "AMZN": 228.15,
    "TSLA": 395.94,
    "MSFT": 509.90,
    "QCOM": 161.83,
    "AMD": 158.57,
    "INTC": 24.08,
    "GLD": 335.42,
    "VGLT": 57.18,
    "VXUS": 73.09
}

# ---------------- Mock Functions ----------------
def get_mock_price(symbol: str) -> float:
    """Return a mock price with slight random variation."""
    base = MOCK_BASE_PRICES.get(symbol.upper(), 100.0)
    jitter = base * (random.random() - 0.5) * 0.04  # ±2%
    return round(base + jitter, 2)

def update_stock_price_mock(symbol: str):
    price = get_mock_price(symbol)
    constants.STOCK_PRICES[symbol] = price

def update_all_stock_prices_mock():
    # Update prices for main portfolio
    for symbol in constants.PORTFOLIO:
        try:
            update_stock_price_mock(symbol)
        except Exception as e:
            print(f"Failed to update {symbol} (mock): {e}")

    # Update prices for all IRA holdings
    import db
    accounts = db.get_retirement_accounts()
    ira_symbols = set()
    for acc_id, name, acc_type, balance in accounts:
        if "IRA" in acc_type:
            holdings = db.get_ira_holdings(acc_id)
            for _, symbol, _ in holdings:
                ira_symbols.add(symbol.upper())
    for symbol in ira_symbols:
        try:
            update_stock_price_mock(symbol)
        except Exception as e:
            print(f"Failed to update IRA {symbol} (mock): {e}")

# ---------------- Real API Functions ----------------
def update_stock_price_api(symbol: str):
    ticker = yf.Ticker(symbol)
    price = None
    try:
        price = ticker.fast_info['last_price']
    except Exception:
        # fallback if fast_info fails
        hist = ticker.history(period="1d")
        if not hist.empty:
            price = hist['Close'].iloc[-1]
    if price is not None:
        constants.STOCK_PRICES[symbol] = float(price)
    else:
        print(f"Failed to fetch price for {symbol} using yfinance.")

def update_all_stock_prices_api():
    for symbol in constants.PORTFOLIO:
        try:
            update_stock_price_api(symbol)
        except Exception as e:
            print(f"Failed to fetch {symbol} (API): {e}")

    # Update prices for all IRA holdings
    import db
    accounts = db.get_retirement_accounts()
    ira_symbols = set()
    for acc_id, name, acc_type, balance in accounts:
        if "IRA" in acc_type:
            holdings = db.get_ira_holdings(acc_id)
            for _, symbol, _ in holdings:
                ira_symbols.add(symbol.upper())
    for symbol in ira_symbols:
        try:
            update_stock_price_api(symbol)
        except Exception as e:
            print(f"Failed to fetch IRA {symbol} (API): {e}")

# ---------------- Shared Functions ----------------

def get_net_worth() -> float:
    total = constants.CASH

    # Add main portfolio
    for symbol, shares in constants.PORTFOLIO.items():
        total += constants.STOCK_PRICES.get(symbol, 0.0) * shares

    # Add treasuries
    for name in constants.TREASURIES:
        total += calculate_current_value(name)

    # Add retirement accounts from DB
    import db
    accounts = db.get_retirement_accounts()
    for acc_id, name, acc_type, balance in accounts:
        if "IRA" in acc_type:
            # Sum value of IRA holdings using current prices
            holdings = db.get_ira_holdings(acc_id)
            ira_total = 0.0
            for _, symbol, shares in holdings:
                price = constants.STOCK_PRICES.get(symbol.upper(), 0.0)
                ira_total += price * shares
            total += ira_total
        else:
            total += balance

    return total

# ---------------- Public Interface ----------------
def update_stock_price(symbol: str):
    """Update a single stock price based on toggle."""
    if USE_MOCK:
        update_stock_price_mock(symbol)
    else:
        update_stock_price_api(symbol)

def update_all_stock_prices():
    """Update all stock prices based on toggle."""
    if USE_MOCK:
        update_all_stock_prices_mock()
    else:
        update_all_stock_prices_api()

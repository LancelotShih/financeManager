from constants import RETIREMENT_ACCOUNTS

def add_retirement(account_type: str, amount: float):
    """Add or update a retirement account balance."""
    RETIREMENT_ACCOUNTS[account_type] = amount

def remove_retirement(account_type: str):
    if account_type in RETIREMENT_ACCOUNTS:
        del RETIREMENT_ACCOUNTS[account_type]

def get_retirement_total() -> float:
    """Sum of all retirement account balances."""
    return sum(RETIREMENT_ACCOUNTS.values())

def update_ira_stock_price(account_type: str, symbol: str, price: float):
    """Update the stock price inside an IRA account."""
    if account_type in RETIREMENT_ACCOUNTS and "portfolio" in RETIREMENT_ACCOUNTS[account_type]:
        portfolio = RETIREMENT_ACCOUNTS[account_type]["portfolio"]
        portfolio[symbol] = portfolio.get(symbol, 0)  # ensure key exists if needed

def get_ira_value(account_type: str, stock_prices: dict) -> float:
    """Calculate current value of stocks inside an IRA account."""
    if account_type not in RETIREMENT_ACCOUNTS or "portfolio" not in RETIREMENT_ACCOUNTS[account_type]:
        return 0.0
    total = 0.0
    for symbol, shares in RETIREMENT_ACCOUNTS[account_type]["portfolio"].items():
        price = stock_prices.get(symbol, 0.0)
        total += price * shares
    return total

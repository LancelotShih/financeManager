# Holds the balances for cash accounts (SWVXX, SPAXX, Checking)
CASH_ACCOUNTS = {
    "SWVXX": 0.0,
    "SPAXX": 0.0,
    "Checking": 0.0
}
# constants.py
from typing import Dict

# Holds your current cash balance
CASH = 0

# Holds the portfolio in-memory (symbol → shares)
# This will mirror DB initially, but will allow live updates
PORTFOLIO: Dict[str, float] = {}

# Holds the live price of each stock (symbol → price)
STOCK_PRICES: Dict[str, float] = {}

# Computed values
NET_WORTH = 0.0

# Treasury securities
TREASURIES = {

}

RETIREMENT_ACCOUNTS = {
    "401k_traditional": {"balance": 0},  # simple numeric
    "401k_roth": {"balance": 0},         # simple numeric
    "IRA_traditional": {"portfolio": {}},  # stock symbol -> shares
    "IRA_roth": {"portfolio": {}}
}

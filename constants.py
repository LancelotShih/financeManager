CASH_ACCOUNTS = {
    "SWVXX": 0.0,
    "SPAXX": 0.0,
    "Checking": 0.0
}
from typing import Dict

CASH = 0

PORTFOLIO: Dict[str, float] = {}

STOCK_PRICES: Dict[str, float] = {}

NET_WORTH = 0.0

TREASURIES = {

}

RETIREMENT_ACCOUNTS = {
    "401k_traditional": {"balance": 0},  # simple numeric
    "401k_roth": {"balance": 0},         # simple numeric
    "IRA_traditional": {"portfolio": {}},  # stock symbol -> shares
    "IRA_roth": {"portfolio": {}}
}

PORTFOLIO_DB_FILE = "portfolio1.db"
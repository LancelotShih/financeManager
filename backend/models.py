from pydantic import BaseModel
from typing import List, Optional

# --- Equities ---
class Equity(BaseModel):
    ticker: str
    shares: float

class EquityWithPrices(Equity):
    current: float
    yesterday_close: float

class EquityWithHistory(Equity):
    prices: list[float]



class CashAccount(BaseModel):
    name: str
    balance: float


# For new lots-based treasuries
class TreasuryLot(BaseModel):
    id: Optional[int] = None
    type: str
    amount: float
    purchase_date: str

class TreasuryYield(BaseModel):
    type: str
    interest_rate: float

class RetirementAccount(BaseModel):
    id: Optional[int] = None
    name: str
    type: str
    balance: float = 0.0

class IRAHolding(BaseModel):
    id: Optional[int] = None
    account_id: int
    symbol: str
    shares: float

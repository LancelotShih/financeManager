from pydantic import BaseModel
from typing import Optional


class Holding(BaseModel):
    symbol: str
    name: str
    shares: float
    price: float
    value: float
    cost_basis: Optional[float] = None
    avg_cost: Optional[float] = None
    day_change: float
    day_change_pct: float
    unrealized_gain: Optional[float] = None
    unrealized_gain_pct: Optional[float] = None


class Portfolio(BaseModel):
    id: str
    name: str
    account_type: str  # "linked" | "watchlist" | "manual"
    holdings: list[Holding]
    total_value: float
    total_cost_basis: Optional[float] = None
    cash: float = 0.0
    day_change: float
    day_change_pct: float
    unrealized_gain: Optional[float] = None
    unrealized_gain_pct: Optional[float] = None


class PortfolioSummary(BaseModel):
    total_value: float
    day_change: float
    day_change_pct: float
    unrealized_gain: Optional[float] = None
    cash_holdings: float
    portfolios: list[Portfolio]


class HistoryPoint(BaseModel):
    date: str
    value: float


class TickerHistory(BaseModel):
    symbol: str
    history: list[HistoryPoint]


class AuthRequest(BaseModel):
    cookies: str


class AuthStatus(BaseModel):
    authenticated: bool
    message: str

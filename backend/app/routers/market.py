from fastapi import APIRouter, Query
from app.models.schemas import TickerHistory, HistoryPoint
from app.services.market_data import get_ticker_history, get_portfolio_history

router = APIRouter()

VALID_PERIODS = {"1d", "5d", "1m", "6m", "ytd", "1y", "all"}


@router.get("/history/{symbol}", response_model=TickerHistory)
async def ticker_history(
    symbol: str,
    period: str = Query("6m", description="1d | 5d | 1m | 6m | ytd | 1y | all"),
):
    if period not in VALID_PERIODS:
        period = "6m"
    return get_ticker_history(symbol.upper(), period)


@router.get("/portfolio-history", response_model=list[HistoryPoint])
async def portfolio_history(
    holdings: str = Query(..., description="Comma-separated SYMBOL:QTY pairs, e.g. AAPL:10,VOO:7"),
    base_value: float = Query(0.0, description="Constant dollar value to add per date (cash + money markets)"),
    period: str = Query("6m"),
):
    if period not in VALID_PERIODS:
        period = "6m"
    holdings_map: dict[str, float] = {}
    for part in holdings.split(","):
        part = part.strip()
        if ":" in part:
            sym, _, qty = part.partition(":")
            try:
                holdings_map[sym.strip().upper()] = float(qty)
            except ValueError:
                pass
    return get_portfolio_history(holdings_map, base_value, period)

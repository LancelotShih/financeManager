"""
Market data service using yfinance for historical price data.
"""

import re
import yfinance as yf
from app.models.schemas import HistoryPoint, TickerHistory

PERIOD_MAP = {
    "1d": ("1d", "5m"),
    "5d": ("5d", "15m"),
    "1m": ("1mo", "1d"),
    "6m": ("6mo", "1d"),
    "ytd": ("ytd", "1d"),
    "1y": ("1y", "1wk"),
    "all": ("max", "1mo"),
}

# Non-ticker internal identifiers used by Fidelity/Treasury
_NON_TICKER = re.compile(
    r"^(SAVINGS|CASH|BOND|IAAAASERIES|TREASURY|FDRXX|SPAXX|SWVXX|FZDXX)$", re.I
)


def _is_valid_ticker(sym: str) -> bool:
    return bool(sym) and not _NON_TICKER.match(sym)


def get_ticker_history(symbol: str, period: str = "6m") -> TickerHistory:
    if not _is_valid_ticker(symbol):
        return TickerHistory(symbol=symbol, history=[])
    yf_period, interval = PERIOD_MAP.get(period, ("6mo", "1d"))
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=yf_period, interval=interval)
        points = [
            HistoryPoint(date=str(idx.date()), value=round(float(row["Close"]), 4))
            for idx, row in hist.iterrows()
        ]
    except Exception:
        points = []
    return TickerHistory(symbol=symbol, history=points)


def get_portfolio_history(
    holdings: dict[str, float],
    base_value: float = 0.0,
    period: str = "6m",
) -> list[HistoryPoint]:
    """
    Compute historical portfolio value: Σ(shares × close_price) + base_value per date.
    holdings maps symbol → share quantity. base_value covers cash and money-market positions
    whose price doesn't change (added as a constant to every data point).
    """
    valid = {sym: qty for sym, qty in holdings.items() if _is_valid_ticker(sym) and qty > 0}
    if not valid and base_value == 0:
        return []

    if not valid:
        # Only constant holdings — return a flat line at base_value for context
        return []

    yf_period, interval = PERIOD_MAP.get(period, ("6mo", "1d"))
    try:
        data = yf.download(
            tickers=" ".join(valid.keys()),
            period=yf_period,
            interval=interval,
            group_by="ticker",
            auto_adjust=True,
            progress=False,
        )
    except Exception:
        return []

    if data.empty:
        return []

    try:
        single = len(valid) == 1
        if single:
            sym = next(iter(valid))
            close_df = data[["Close"]].rename(columns={"Close": sym}).ffill()
        else:
            if data.columns.nlevels > 1:
                close_df = data.xs("Close", axis=1, level=0).ffill()
            else:
                return []

        result = []
        for idx, row in close_df.iterrows():
            day_value = base_value
            for sym, qty in valid.items():
                price = row.get(sym, float("nan"))
                if price == price:  # skip NaN
                    day_value += qty * float(price)
            if day_value > 0:
                result.append(HistoryPoint(date=str(idx.date()), value=round(day_value, 2)))
        return result
    except Exception:
        return []

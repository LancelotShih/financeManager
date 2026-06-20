"""
Yahoo Finance client — cookie-based authentication via SSR page scraping.

Discovery: Yahoo Finance (SvelteKit) embeds all API responses server-side in
data-sveltekit-fetched elements. We load the /portfolios page once, extract the
embedded JSON responses (no crumb needed), and use yfinance for market data.
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf
from app.models.schemas import Holding, Portfolio, PortfolioSummary

# In-memory quote cache — keyed by symbol, value is (data_dict, fetch_timestamp)
_quote_cache: dict[str, tuple[dict, float]] = {}
_QUOTE_TTL = 300  # seconds before re-fetching

# Symbols that are internal Fidelity/Treasury identifiers, not real tickers
_NON_TICKER_PATTERNS = re.compile(
    r"^(SAVINGS|CASH|BOND|IAAAASERIES|TREASURY|FDRXX|SPAXX|SWVXX|FZDXX)$", re.I
)


HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _extract_ssr(html: str) -> dict[str, object]:
    """Parse all data-sveltekit-fetched elements from page HTML.
    Returns a dict keyed by data-url value."""
    soup = BeautifulSoup(html, "lxml")
    result: dict[str, object] = {}
    for el in soup.find_all(attrs={"data-sveltekit-fetched": True}):
        url = el.get("data-url", "")
        try:
            outer = json.loads(el.string or "{}")
            if outer.get("status") == 200:
                body = outer.get("body", "{}")
                result[url] = json.loads(body) if isinstance(body, str) else body
        except (json.JSONDecodeError, TypeError):
            pass
    return result


class YahooFinanceClient:
    def __init__(self, cookies_str: str):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self._load_cookies(cookies_str)

    def _load_cookies(self, raw: str) -> None:
        """Accept JSON array (Cookie Editor), raw cookie string, or full cURL command."""
        raw = raw.strip()
        pairs: list[str] = []

        # Format 1: JSON array from Cookie Editor
        if raw.startswith("["):
            try:
                entries = json.loads(raw)
                for entry in entries:
                    name = entry.get("name", "").strip()
                    value = entry.get("value", "").strip()
                    if name and value:
                        pairs.append(f"{name}={value}")
                if pairs:
                    self.session.headers["Cookie"] = "; ".join(pairs)
                    return
            except json.JSONDecodeError:
                pass

        # Format 3: cURL command
        curl_match = re.search(
            r"-[Hh]\s+['\"]?[Cc]ookie:\s*(.+?)(?:['\"]?\s+-[Hh]|['\"]?\s*$)",
            raw, re.DOTALL,
        )
        if curl_match:
            raw = curl_match.group(1).strip().strip("'\"")

        # Format 2: raw cookie header string
        SKIP_ATTRS = {"path", "domain", "expires", "httponly", "samesite", "secure", "max-age"}
        for part in re.split(r"[;\n\r]+", raw):
            part = part.strip().strip("'\"")
            if not part:
                continue
            if "=" in part:
                key, _, value = part.partition("=")
                key = key.strip()
                if key.lower() in SKIP_ATTRS:
                    continue
                pairs.append(f"{key}={value.strip()}")

        if pairs:
            self.session.headers["Cookie"] = "; ".join(pairs)

    def _fetch_portfolios_page(self) -> dict[str, object]:
        """Load /portfolios page and return all embedded SSR data keyed by URL."""
        resp = self.session.get("https://finance.yahoo.com/portfolios", timeout=20)
        resp.raise_for_status()
        return _extract_ssr(resp.text)

    def validate(self) -> tuple[bool, str]:
        """Check auth by confirming user profile is present in the SSR page."""
        try:
            cookie_header = self.session.headers.get("Cookie", "")
            cookie_names = [p.split("=")[0].strip() for p in cookie_header.split(";") if "=" in p]
            n = len(cookie_names)

            ssr = self._fetch_portfolios_page()

            # Look for the profile SSR element
            for key, data in ssr.items():
                if "/xhr/profile" in key and isinstance(data, dict):
                    attrs = data.get("attributes", {})
                    name_obj = attrs.get("name", {})
                    display = (
                        attrs.get("loggedInDisplayName")
                        or f"{name_obj.get('given','')} {name_obj.get('family','')}".strip()
                        or data.get("id", "")
                    )
                    return True, f"Authenticated as {display} — {n} cookies loaded"

            # Portfolio data found counts as valid auth too
            for key, data in ssr.items():
                if "portfolio/all" in key and isinstance(data, dict):
                    if data.get("finance", {}).get("result"):
                        return True, f"Authenticated — {n} cookies loaded, portfolio data found"

            return False, f"Cookies loaded ({n}) but no authenticated profile found in page — cookies may be expired"
        except Exception as e:
            return False, f"Connection error: {e}"

    def get_portfolios_ssr(self) -> list[dict]:
        """Return raw portfolio list from the SSR-embedded portfolio/all response."""
        ssr = self._fetch_portfolios_page()
        for key, data in ssr.items():
            if "portfolio/all" in key and isinstance(data, dict):
                result = data.get("finance", {}).get("result", [])
                if result:
                    return result[0].get("portfolios", [])
        return []


def _lots_to_holding(symbol: str, positions: list[dict], quote: dict) -> Holding:
    """Convert a position's lots into a Holding using live quote data."""
    price = float(quote.get("regularMarketPrice", 0) or 0)
    day_chg_pct = float(quote.get("regularMarketChangePercent", 0) or 0)
    name = quote.get("shortName", symbol)

    total_shares = 0.0
    total_cost = 0.0
    lot_market_value = 0.0
    has_lots = False

    for lot in positions:
        # Yahoo Finance uses "quantity" for share count in lot data
        shares = float(lot.get("quantity", 0) or lot.get("shares", 0) or 0)
        cost_per = float(lot.get("purchasePrice", 0) or 0)
        lot_market_value += float(lot.get("currentMarketValue", 0) or 0)
        if shares:
            total_shares += shares
            total_cost += shares * cost_per
            has_lots = True

    if total_shares and price:
        value = total_shares * price
    elif lot_market_value:
        value = lot_market_value
    elif price:
        value = price
    else:
        value = 0.0
    day_chg = value * (day_chg_pct / 100) if value else 0
    cost_basis = total_cost if has_lots and total_cost else None
    avg_cost = (total_cost / total_shares) if (has_lots and total_shares) else None
    unrealized = (value - total_cost) if (cost_basis and value) else None
    unrealized_pct = (unrealized / total_cost * 100) if (unrealized is not None and total_cost) else None

    return Holding(
        symbol=symbol,
        name=name,
        shares=total_shares,
        price=price,
        value=value,
        cost_basis=cost_basis,
        avg_cost=avg_cost,
        day_change=day_chg,
        day_change_pct=day_chg_pct,
        unrealized_gain=unrealized,
        unrealized_gain_pct=unrealized_pct,
    )


def _ssr_quote_one(sym: str, session: requests.Session) -> dict:
    """Fetch a single ticker's price by loading its Yahoo Finance quote page SSR."""
    try:
        r = session.get(f"https://finance.yahoo.com/quote/{sym}", timeout=15)
        ssr = _extract_ssr(r.text)
        for key, val in ssr.items():
            if "quote" not in key.lower():
                continue
            res = val.get("quoteResponse", {}).get("result", []) if isinstance(val, dict) else []
            for item in res:
                if item.get("symbol") != sym:
                    continue
                price_raw = item.get("regularMarketPrice")
                chg_raw = item.get("regularMarketChangePercent")
                price = price_raw.get("raw", 0) if isinstance(price_raw, dict) else (price_raw or 0)
                chg = chg_raw.get("raw", 0) if isinstance(chg_raw, dict) else (chg_raw or 0)
                name = item.get("shortName") or item.get("longName") or sym
                if price:
                    return {"regularMarketPrice": float(price), "regularMarketChangePercent": float(chg), "shortName": name}
    except Exception:
        pass
    return {"regularMarketPrice": 0, "regularMarketChangePercent": 0, "shortName": sym}


def _ssr_quotes(symbols: list[str], session: requests.Session) -> dict[str, dict]:
    """Load quote pages in parallel and extract prices from SSR — works even when the data API is rate-limited."""
    result: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(_ssr_quote_one, sym, session): sym for sym in symbols}
        for fut in as_completed(futures):
            sym = futures[fut]
            result[sym] = fut.result()
    return result


def _yf_quotes(symbols: list[str], session: requests.Session | None = None) -> dict[str, dict]:
    """
    Fetch live quotes via yfinance, using our authenticated session when provided.
    Results are cached for QUOTE_TTL seconds to stay well under rate limits.
    Non-ticker internal symbols (SAVINGS, SPAXX, etc.) are skipped.
    """
    if not symbols:
        return {}

    now = time.time()
    result: dict[str, dict] = {}
    to_fetch: list[str] = []

    for sym in dict.fromkeys(symbols):  # deduplicate, preserve order
        if _NON_TICKER_PATTERNS.match(sym):
            result[sym] = {"regularMarketPrice": 0, "regularMarketChangePercent": 0, "shortName": sym}
            continue
        cached_data, cached_ts = _quote_cache.get(sym, ({}, 0.0))
        if cached_data and (now - cached_ts) < _QUOTE_TTL:
            result[sym] = cached_data
        else:
            to_fetch.append(sym)

    if not to_fetch:
        return result

    # Try yfinance batch download first (chart endpoint)
    yf_succeeded: set[str] = set()
    try:
        data = yf.download(
            tickers=" ".join(to_fetch),
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=True,
            progress=False,
            session=session,
        )
        single = len(to_fetch) == 1
        if not data.empty:
            for sym in to_fetch:
                try:
                    close = data["Close"] if single else data[sym]["Close"]
                    close = close.dropna()
                    if close.empty:
                        continue
                    price = float(close.iloc[-1])
                    prev = float(close.iloc[-2]) if len(close) >= 2 else price
                    change_pct = ((price - prev) / prev * 100) if prev else 0
                    q = {"regularMarketPrice": price, "regularMarketChangePercent": change_pct, "shortName": sym}
                    _quote_cache[sym] = (q, now)
                    result[sym] = q
                    yf_succeeded.add(sym)
                except Exception:
                    pass
    except Exception:
        pass

    # Fall back to SSR page scraping for any symbol yfinance couldn't serve
    still_needed = [s for s in to_fetch if s not in yf_succeeded]
    if still_needed and session is not None:
        ssr_result = _ssr_quotes(still_needed, session)
        for sym, q in ssr_result.items():
            _quote_cache[sym] = (q, now)
            result[sym] = q
    elif still_needed:
        for sym in still_needed:
            q = {"regularMarketPrice": 0, "regularMarketChangePercent": 0, "shortName": sym}
            _quote_cache[sym] = (q, now)
            result[sym] = q

    return result


def build_portfolio_summary(client: YahooFinanceClient) -> PortfolioSummary:
    """Fetch portfolios from Yahoo Finance SSR and enrich with yfinance market data."""
    raw_portfolios = client.get_portfolios_ssr()

    portfolios: list[Portfolio] = []
    total_value = 0.0
    total_day_change = 0.0
    total_cash = 0.0

    for raw in raw_portfolios:
        pf_id = raw.get("pfId", "unknown")
        pf_name = raw.get("pfName", "Portfolio")
        pf_type = raw.get("pfType", "WATCHLIST")
        positions = raw.get("positions", [])
        cash_position = float(raw.get("cashPosition", 0) or 0)

        symbols = [p["symbol"] for p in positions if p.get("symbol")]
        quotes = _yf_quotes(symbols, session=client.session)

        holdings: list[Holding] = []
        pf_value = 0.0
        pf_day_change = 0.0

        for pos in positions:
            sym = pos.get("symbol")
            if not sym:
                continue
            q = quotes.get(sym, {})
            lots = pos.get("lots", [])
            h = _lots_to_holding(sym, lots, q)
            holdings.append(h)
            pf_value += h.value
            pf_day_change += h.day_change

        pf_value += cash_position
        pf_day_chg_pct = (pf_day_change / (pf_value - pf_day_change) * 100) if (pf_value and pf_value != pf_day_change) else 0
        pf_cost = sum(h.cost_basis for h in holdings if h.cost_basis is not None) or None
        # Sum unrealized from individual holdings so cash doesn't inflate the figure
        pf_unrealized = sum(h.unrealized_gain for h in holdings if h.unrealized_gain is not None) or None
        pf_unrealized_pct = (pf_unrealized / pf_cost * 100) if (pf_unrealized is not None and pf_cost) else None

        account_type = (
            "watchlist" if pf_type == "WATCHLIST"
            else "linked" if "LINKED" in pf_type or pf_type in ("BROKERAGE", "AGGREGATED")
            else "manual"
        )

        portfolios.append(Portfolio(
            id=pf_id,
            name=pf_name,
            account_type=account_type,
            holdings=holdings,
            total_value=pf_value,
            total_cost_basis=pf_cost,
            cash=cash_position,
            day_change=pf_day_change,
            day_change_pct=pf_day_chg_pct,
            unrealized_gain=pf_unrealized,
            unrealized_gain_pct=pf_unrealized_pct,
        ))

        if account_type != "watchlist":
            total_value += pf_value
            total_day_change += pf_day_change
            total_cash += cash_position

    total_day_chg_pct = (total_day_change / (total_value - total_day_change) * 100) if (total_value and total_value != total_day_change) else 0
    total_unrealized = sum(p.unrealized_gain for p in portfolios if p.unrealized_gain is not None and p.account_type != "watchlist") or None

    return PortfolioSummary(
        total_value=total_value,
        day_change=total_day_change,
        day_change_pct=total_day_chg_pct,
        unrealized_gain=total_unrealized,
        cash_holdings=total_cash,
        portfolios=portfolios,
    )

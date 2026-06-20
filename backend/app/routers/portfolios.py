from fastapi import APIRouter, Depends, HTTPException
from app.config import get_settings, Settings
from app.models.schemas import PortfolioSummary, Portfolio
from app.services.yahoo_client import YahooFinanceClient, build_portfolio_summary

router = APIRouter()


def get_client(settings: Settings = Depends(get_settings)) -> YahooFinanceClient:
    cookies = settings.effective_cookies
    if not cookies:
        raise HTTPException(status_code=401, detail="Yahoo Finance cookies not configured — drop cookies.json in the backend folder")
    return YahooFinanceClient(cookies)


@router.get("/", response_model=PortfolioSummary)
async def list_portfolios(client: YahooFinanceClient = Depends(get_client)):
    summary = build_portfolio_summary(client)
    if not summary.portfolios:
        raise HTTPException(status_code=404, detail="No portfolios found — check your cookies")
    return summary


@router.get("/{pf_id}", response_model=Portfolio)
async def get_portfolio(pf_id: str, client: YahooFinanceClient = Depends(get_client)):
    summary = build_portfolio_summary(client)
    match = next((p for p in summary.portfolios if p.id == pf_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Portfolio {pf_id} not found")
    return match

import json
import os
from fastapi import APIRouter, Depends, UploadFile, File
from app.models.schemas import AuthRequest, AuthStatus
from app.config import get_settings, Settings, COOKIES_FILE
from app.services.yahoo_client import YahooFinanceClient

router = APIRouter()

COOKIES_PATH = os.path.abspath(COOKIES_FILE)


def _save_cookies_file(content: str) -> None:
    with open(COOKIES_PATH, "w") as f:
        f.write(content)


def _make_client(settings: Settings) -> YahooFinanceClient:
    cookies = settings.effective_cookies
    return YahooFinanceClient(cookies)


@router.post("/set-cookies", response_model=AuthStatus)
async def set_cookies(body: AuthRequest, settings: Settings = Depends(get_settings)):
    client = YahooFinanceClient(body.cookies)
    valid, message = client.validate()
    if valid:
        _save_cookies_file(body.cookies)
        get_settings.cache_clear()
    return AuthStatus(authenticated=valid, message=message)


@router.post("/upload-cookies", response_model=AuthStatus)
async def upload_cookies(file: UploadFile = File(...)):
    """Accept a cookies.json file uploaded directly from the browser."""
    content = (await file.read()).decode("utf-8").strip()
    client = YahooFinanceClient(content)
    valid, message = client.validate()
    if valid:
        _save_cookies_file(content)
        get_settings.cache_clear()
    return AuthStatus(authenticated=valid, message=message)


@router.get("/status", response_model=AuthStatus)
async def auth_status(settings: Settings = Depends(get_settings)):
    cookies = settings.effective_cookies
    if not cookies:
        return AuthStatus(
            authenticated=False,
            message="No cookies found — drop cookies.json in the backend folder or use the Setup page",
        )
    client = YahooFinanceClient(cookies)
    valid, message = client.validate()
    return AuthStatus(authenticated=valid, message=message)


@router.get("/debug")
async def debug(settings: Settings = Depends(get_settings)):
    """Diagnostic endpoint — shows cookies loaded and a live portfolio SSR probe."""
    cookies_raw = settings.effective_cookies
    if not cookies_raw:
        return {"error": "No cookies loaded"}

    client = YahooFinanceClient(cookies_raw)
    cookie_header = client.session.headers.get("Cookie", "")
    cookie_names = [p.split("=")[0].strip() for p in cookie_header.split(";") if "=" in p]

    # Probe the portfolios page and report what SSR keys came back
    try:
        from app.services.yahoo_client import _extract_ssr
        r = client.session.get("https://finance.yahoo.com/portfolios", timeout=20)
        ssr_keys = list(_extract_ssr(r.text).keys())
        probe = {"status": r.status_code, "ssr_keys": ssr_keys[:20]}
    except Exception as exc:
        probe = {"error": str(exc)}

    return {
        "cookies_loaded": len(cookie_names),
        "cookie_names": cookie_names,
        "portfolios_probe": probe,
    }

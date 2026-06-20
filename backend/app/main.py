from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import portfolios
from app.config import get_settings
from app.routers import auth, market

settings = get_settings()

app = FastAPI(title="Finance Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        settings.production_host,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["portfolios"])
app.include_router(market.router, prefix="/api/market", tags=["market"])


@app.get("/health")
async def health():
    return {"status": "ok"}

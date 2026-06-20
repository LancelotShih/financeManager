# Finance Manager

A personal finance dashboard that reads your Yahoo Finance portfolios and presents them in a clean, self-hosted UI. It shows live holdings, day change, unrealized gains/losses, allocation breakdowns, and historical performance charts.

---

## What it does

- Pulls your Yahoo Finance portfolios using your browser session cookies
- Displays a dashboard with an aggregated view across all non-watchlist accounts
- Shows per-portfolio breakdowns with holdings tables and allocation charts
- Plots historical portfolio value using live market prices
- Lets you manage your Yahoo Finance session from a Setup page (paste cookies or upload a `cookies.json` file)

---

## Architecture

```
frontend/   React + TypeScript + Vite + Tailwind
backend/    Python FastAPI
```

**Frontend** is a single-page app built with React. It talks to the backend over a REST API (`/api/*`). In development it runs on Vite's dev server (port 5173). In production it's compiled to static files and served by nginx.

**Backend** is a FastAPI server that scrapes your Yahoo Finance portfolio pages using your session cookies (via `requests` + `yfinance` + `BeautifulSoup`). It exposes three routers:

| Prefix | Purpose |
|---|---|
| `/api/auth` | Validate and store Yahoo Finance cookies |
| `/api/portfolios` | List all portfolios / get a single portfolio with live holdings |
| `/api/market` | Historical price data for charting |

The backend requires no database — portfolio state is fetched live from Yahoo on each request. The only persistent file is `backend/cookies.json`, which stores your Yahoo session.

---

## Prerequisites

- **Docker mode:** Docker + Docker Compose
- **Local mode:** Python 3.12+, Node 20+

---

## Setup — Yahoo Finance cookies

The app authenticates to Yahoo Finance using your browser session cookies. You need to grab these once:

1. Log in to [finance.yahoo.com](https://finance.yahoo.com) in your browser
2. Open DevTools → Network tab → reload the page
3. Click any `finance.yahoo.com` request → Headers → copy the full `Cookie:` header value

Then either:
- Paste the cookie string into the **Setup** page in the UI, or
- Save it as `backend/cookies.json` before starting (the file should contain just the raw cookie string)

---

## Running with Docker (recommended)

```bash
# Copy and fill in the env file
cp backend/.env.example backend/.env

# Build and start both services in the background
docker compose up -d

# Stop
docker compose down
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

The containers restart automatically (`restart: unless-stopped`) — they keep running after you close your terminal or IDE.

---

## Running locally

**Backend**

```bash
cd backend

# Copy and fill in the env file
cp .env.example .env

# Start (creates a venv and installs deps automatically on first run)
./start.sh
```

Backend runs at `http://localhost:8000`.

**Frontend**

```bash
cd frontend

# Start the Vite dev server
./start.sh
```

Frontend runs at `http://localhost:5173` with hot reload.

---

## Environment variables

Configured in `backend/.env` (copy from `.env.example`):

| Variable | Description |
|---|---|
| `YAHOO_COOKIES` | Yahoo Finance cookie string (alternative to `cookies.json`) |
| `PRODUCTION_HOST` | Your production domain, added to the CORS allowlist |

---

## Project structure

```
financeManager/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS config
│   │   ├── config.py        # Settings (env + cookies.json)
│   │   ├── routers/         # auth, portfolios, market
│   │   ├── services/        # Yahoo Finance scraper + market data
│   │   └── models/          # Pydantic schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   └── start.sh             # Local dev launcher
└── frontend/
    ├── src/
    │   ├── pages/           # Dashboard, Portfolios, PortfolioDetail, Setup
    │   ├── components/      # Charts, holdings table, layout
    │   ├── hooks/           # React Query data hooks
    │   ├── api/             # Typed API client
    │   └── types/           # Shared TypeScript interfaces
    ├── Dockerfile
    ├── nginx.conf           # Production static file server config
    └── start.sh             # Local dev launcher
```

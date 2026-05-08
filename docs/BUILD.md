# Risk Dashboard — Master Build Guide

Build this project module by module in the order below. Each step has its own detailed instruction file in `docs/modules/`.

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ (for local frontend dev outside Docker)
- Python 3.11+ (for local backend dev outside Docker)
- A free FRED API key from https://fred.stlouisfed.org/docs/api/api_key.html

## Build Order

| Step | Module | File |
|------|--------|------|
| 1 | Docker + env setup | `01_DOCKER_SETUP.md` |
| 2 | Backend core (FastAPI, DB, config) | `02_BACKEND_CORE.md` |
| 3 | Data layer (FRED, Tiingo-backed market proxy fetcher, SQLite cache) | `03_DATA_LAYER.md` |
| 4 | Asset class modules | `04_ASSET_CLASSES.md` |
| 5 | Risk engine (metrics, cycle, valuation) | `05_RISK_ENGINE.md` |
| 6 | Frontend setup (Next.js, Tailwind, Shadcn) | `06_FRONTEND_SETUP.md` |
| 7 | Dashboard components | `07_COMPONENTS.md` |
| 8 | Portfolio optimizer (efficient frontier) | `08_PORTFOLIO_OPTIMIZER.md` |
| 9 | Extending (add new sub-asset classes) | `09_EXTENDING.md` |

## Quick Start (after all modules are built)

```bash
# 1. Set backend API keys
cp backend/.env.example backend/.env
# Edit backend/.env → set:
# FRED_API_KEY=your_key_here
# TIINGO_API_KEY=your_key_here

# 2. Set frontend env
cp frontend/.env.local.example frontend/.env.local

# 3. Start everything
docker-compose up --build

# 4. Verify backend health before first refresh
curl http://localhost:8000/health

# 5. Seed initial data (required on first run — takes ~2 min)
curl -X POST http://localhost:8000/api/v1/data-status/refresh

# 6. Poll data readiness until overall_status is not "error"
curl http://localhost:8000/api/v1/data-status

# 7. Run core endpoint smoke checks
curl http://localhost:8000/api/v1/equities/all
curl http://localhost:8000/api/v1/credit/all
curl http://localhost:8000/api/v1/credit/yield-curve
curl http://localhost:8000/api/v1/hard-assets/all
curl http://localhost:8000/api/v1/cash/all

# 8. Open dashboard
# Windows PowerShell:
start http://localhost:3000
```

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/v1/equities/all` | All equity sub-classes |
| `GET /api/v1/equities/large-cap` | Large cap metrics |
| `GET /api/v1/equities/mid-cap` | Mid cap metrics |
| `GET /api/v1/equities/small-cap` | Small cap metrics |
| `GET /api/v1/credit/all` | All credit sub-classes |
| `GET /api/v1/credit/government` | Government bonds |
| `GET /api/v1/credit/corporate-ig` | Investment grade corporate |
| `GET /api/v1/credit/corporate-hy` | High yield corporate |
| `GET /api/v1/credit/yield-curve` | Treasury yield curve points |
| `GET /api/v1/hard-assets/all` | All hard asset sub-classes |
| `GET /api/v1/hard-assets/gold` | Gold |
| `GET /api/v1/hard-assets/reits` | REITs |
| `GET /api/v1/hard-assets/commodities` | Broad commodities |
| `GET /api/v1/cash/all` | Cash / money market |
| `POST /api/v1/portfolio/frontier` | Efficient frontier (body: PortfolioWeights) |
| `GET /api/v1/data-status` | Data freshness status |
| `POST /api/v1/data-status/refresh` | Manual data refresh |
| `GET /health` | Health check |

Full Swagger UI: http://localhost:8000/docs

## Handoff References

- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
- `docs/RUNBOOKS.md`
- `docs/KNOWN_GAPS.md`
- `docs/ROADMAP.md`

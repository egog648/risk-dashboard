# Risk Dashboard — Master Build Guide

Build this project module by module in the order below. Each step has its own detailed instruction file in `docs/modules/`.

**Documentation entry point:** [`docs/README.md`](README.md) | **Build rules:** [`docs/DOC_RULES.md`](DOC_RULES.md)

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ (for local frontend dev outside Docker)
- Python 3.11+ (for local backend dev outside Docker)
- A free FRED API key from https://fred.stlouisfed.org/docs/api/api_key.html
- A free Tiingo API key from https://app.tiingo.com

---

# Part 1 — Risk Dashboard Foundation (Modules 01–09)

## Build Order

| Step | Phase | Module | File |
|------|-------|--------|------|
| 1 | 1 | Docker + env setup | `01_DOCKER_SETUP.md` |
| 2 | 1 | Backend core (FastAPI, DB, config) | `02_BACKEND_CORE.md` |
| 3 | 1 | Data layer (FRED, Tiingo, SQLite cache) | `03_DATA_LAYER.md` |
| 4 | 1 | Asset class modules | `04_ASSET_CLASSES.md` |
| 5 | 1 | Risk engine (metrics, cycle, valuation) | `05_RISK_ENGINE.md` |
| 6 | 1 | Frontend setup (Next.js, Tailwind) | `06_FRONTEND_SETUP.md` |
| 7 | 1 | Dashboard components | `07_COMPONENTS.md` |
| 8 | 1 | Portfolio optimizer (efficient frontier) | `08_PORTFOLIO_OPTIMIZER.md` |
| 9 | 1 | Extending (add new sub-asset classes) | `09_EXTENDING.md` |

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
| `GET /api/v1/tickers` | List custom ticker vehicles (Module 11) |
| `POST /api/v1/tickers` | Create custom ticker (Tiingo-validated) |
| `GET /api/v1/tickers/{id}` | Get single ticker |
| `PUT /api/v1/tickers/{id}` | Update ticker |
| `DELETE /api/v1/tickers/{id}` | Deactivate ticker |
| `POST /api/v1/tickers/validate` | Validate symbol without saving |
| `GET /api/v1/tickers/recommend` | Rank registry tickers for profile G/I/S + aggression (Module 16) |

Full Swagger UI: http://localhost:8000/docs

---

# Part 2 — Finesse Funds Advisory Expansion (Modules 10–17)

## Build Order

| Step | Phase | Module | File | Status |
|------|-------|--------|------|--------|
| 10 | 2 | Finesse branding | `10_FINESSE_BRANDING.md` | Done |
| 11 | 2 | Custom ticker registry | `11_TICKER_REGISTRY.md` | Done |
| 12 | 2 | Investment profiler | `12_INVESTMENT_PROFILER.md` | Done |
| 13 | 2 | Profile → portfolio bridge | `13_PROFILE_TO_PORTFOLIO.md` | Done |
| 14 | 2 | Client workspace | `14_CLIENT_WORKSPACE.md` | Done |
| 15 | 2 | Advisor report + market callouts | `15_ADVISOR_REPORT.md` | Done |
| 16 | 2 | Vehicle recommendations | `16_VEHICLE_RECOMMENDATIONS.md` | Done |
| 17 | 2 | Advanced analytics | `17_ADVANCED_ANALYTICS.md` | Deferred |

## Quick Start (after Module 16)

```bash
# 1. Ensure Part 1 app is running (see Quick Start above)

# 2. Open ticker registry and seed vehicles
start http://localhost:3000/tickers

# 3. Add tickers via API (examples)
curl -X POST http://localhost:8000/api/v1/tickers \
  -H "Content-Type: application/json" \
  -d '{"ticker":"JEPI","display_name":"JPMorgan Equity Premium Income ETF","asset_class":"equities","primary_objective":"income","growth_pct":10,"income_pct":80,"safety_pct":10}'

# 4. Get ranked recommendations for a profile sleeve
curl "http://localhost:8000/api/v1/tickers/recommend?growth_pct=15&income_pct=65&safety_pct=20&aggression=55&asset_class=equities"

# 5. Complete profiler summary — vehicle tables use registry matches with static fallback
start http://localhost:3000/profiler/summary

# 6. Run recommendation tests
cd backend && pytest tests/test_ticker_recommendations.py
```

## Handoff References

- `docs/README.md`
- `docs/DOC_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
- `docs/RUNBOOKS.md`
- `docs/KNOWN_GAPS.md`
- `docs/ROADMAP.md`
- `docs/sessions/HANDOFF_NOTE.md`

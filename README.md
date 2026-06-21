# Risk Dashboard

A macro risk dashboard that calculates forward-looking risk and expected returns for 4 major asset classes and their sub-classes, powered by free data from FRED and yfinance.

## Repository

- GitHub: https://github.com/egog648/risk-dashboard.git

## Asset Classes

| Class | Sub-classes |
|---|---|
| Equities | Large Cap, Mid Cap, Small Cap |
| Credit | Government Bonds, Corporate Bonds (IG + HY) |
| Hard Assets / Alts | REITs, Gold, Commodities |
| Cash | Money Market / T-Bills |

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Shadcn UI, Tremor, Recharts, TanStack Query
- **Backend**: FastAPI (Python 3.11+), pandas, numpy, scipy, PyPortfolioOpt
- **Data**: FRED API (`fredapi`), Tiingo-backed market price fetcher (ETF proxies)
- **Storage**: SQLite (SQLAlchemy ORM)
- **Infrastructure**: Docker + docker-compose

## Quick Start

1. Configure backend keys (FRED + Tiingo):
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and set:
   # FRED_API_KEY=your_key_here
   # TIINGO_API_KEY=your_key_here
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Open http://localhost:3000

**Production compose** (release targets, no hot reload):

```bash
docker compose -f docker-compose.prod.yml up --build
```

See `docs/modules/01_DOCKER_SETUP.md` for production env details.

## Handoff Docs

Start at **`docs/README.md`**, then as needed:
- `docs/BUILD.md` — build index (Phase 1 + Phase 2)
- `docs/DOC_RULES.md` — doc and agent rules
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
- `docs/RUNBOOKS.md`
- `docs/KNOWN_GAPS.md`
- `docs/ROADMAP.md`

## Build Guide

See `docs/BUILD.md` for the complete ordered build guide.
Phase 1 modules: `docs/modules/01–09`. Phase 2 (Finesse advisory): `docs/modules/10–17`.

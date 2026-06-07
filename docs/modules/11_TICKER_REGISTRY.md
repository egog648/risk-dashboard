# Module 11 — Custom Ticker Registry

## Goal
Persist advisor-curated ETF/ticker vehicles with Growth / Income / Safety classification (primary tag + optional triangle weights). Validate symbols via Tiingo on create.

## Files Involved

**Backend:**
- `backend/app/models/db_models.py` — `CustomTicker` ORM model
- `backend/app/models/schemas.py` — Pydantic create/update/response schemas
- `backend/app/services/tickers/registry.py` — CRUD + validation helpers
- `backend/app/api/v1/endpoints/tickers.py` — REST endpoints
- `backend/app/api/v1/router.py` — register router
- `backend/tests/test_ticker_registry.py`

**Frontend:**
- `frontend/app/tickers/page.tsx`
- `frontend/lib/api/tickers.ts`
- `frontend/hooks/useTickers.ts`
- `frontend/types/tickers.ts`
- `frontend/components/tickers/TickerForm.tsx`
- `frontend/components/tickers/TickerList.tsx`
- `frontend/components/tickers/ObjectiveBadge.tsx`

## Data Model

Table `custom_tickers`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK | |
| `ticker` | str unique | Uppercase, e.g. `JEPI` |
| `display_name` | str | Full fund name |
| `asset_class` | enum | `equities`, `credit`, `hard_assets`, `cash` |
| `primary_objective` | enum | `growth`, `income`, `safety` (required) |
| `growth_pct` | float | Triangle weight 0–100 |
| `income_pct` | float | |
| `safety_pct` | float | Must sum to 100 (±0.01) |
| `notes` | str optional | Advisor notes |
| `risk_proxy_ticker` | str optional | e.g. `SPY` for risk metrics |
| `is_active` | bool | Soft delete |
| `created_at`, `updated_at` | datetime | |

### Classification rules

1. **Primary objective** is required (Growth, Income, or Safety).
2. If triangle weights omitted, defaults from primary:
   - growth → `100/0/0`, income → `0/100/0`, safety → `0/0/100`
3. **Advanced mode:** custom weights (e.g. JEPI → `10/80/10`).
4. Custom tickers are **implementation vehicles** — separate from macro model proxies in `YFINANCE_TICKERS` (SPY, LQD, etc.).

## API Contract

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/tickers` | List active tickers; query: `asset_class`, `primary_objective` |
| `GET` | `/api/v1/tickers/{id}` | Single ticker |
| `POST` | `/api/v1/tickers` | Create; Tiingo validate; reject duplicates |
| `PUT` | `/api/v1/tickers/{id}` | Update |
| `DELETE` | `/api/v1/tickers/{id}` | Soft-delete (`is_active=false`) |
| `POST` | `/api/v1/tickers/validate` | Check symbol exists without saving |

**Create body example:**
```json
{
  "ticker": "JEPI",
  "display_name": "JPMorgan Equity Premium Income ETF",
  "asset_class": "equities",
  "primary_objective": "income",
  "growth_pct": 10,
  "income_pct": 80,
  "safety_pct": 10,
  "notes": "Covered-call income equity"
}
```

## Seed Examples

| Ticker | Asset class | Primary | G/I/S | Notes |
|--------|-------------|---------|-------|-------|
| JEPI | equities | income | 10/80/10 | Covered-call income |
| JEPQ | equities | income | 15/75/10 | Nasdaq premium income |
| VTI | equities | growth | 100/0/0 | Broad market core |
| SCHD | equities | income | 20/70/10 | Dividend equity |
| BIL | cash | safety | 0/10/90 | T-bill safety |

## Verify

```bash
# Backend
cd backend && pytest tests/test_ticker_registry.py

# Manual
curl -X POST http://localhost:8000/api/v1/tickers -H "Content-Type: application/json" \
  -d '{"ticker":"JEPI","display_name":"JPMorgan Equity Premium Income ETF","asset_class":"equities","primary_objective":"income","growth_pct":10,"income_pct":80,"safety_pct":10}'
curl http://localhost:8000/api/v1/tickers

# Frontend
cd frontend && npm run dev
# http://localhost:3000/tickers — add, filter, edit tickers
```

## Exit Criteria

- CRUD works end-to-end with SQLite persistence.
- Duplicate ticker rejected; invalid symbol returns 422.
- Triangle weights validated to sum to 100.
- `/tickers` page uses Finesse branding (Module 10).
- Backend tests pass.

## See Also

- Module 16 — vehicle recommendations consume this registry
- `docs/METHODOLOGY.md` — Ticker Objective Classification (when added)

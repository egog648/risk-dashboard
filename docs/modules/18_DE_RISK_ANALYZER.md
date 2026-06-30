# Module 18 — De-Risk Analyzer

## Goal

Standalone Practice tool at `/de-risk` for tax-aware portfolio de-risking. Advisors select a **Client → Portfolio**, upload a lot-level holdings snapshot, configure assumptions, and receive tiered sell recommendations.

## Files Involved

**Backend:**
- `backend/app/services/derisk/` — pure engine (`tax`, `decision`, `tiers`, `sell_list`, `risk`, `ingestion`, `runner`, `workspace`)
- `backend/app/api/v1/endpoints/derisk.py`
- `backend/app/models/db_models.py` — `HoldingsSnapshot`, `Lot`, `DeriskAssumptions`, `DeriskAnalysisRun`, etc.

**Frontend:**
- `frontend/app/de-risk/page.tsx`
- `frontend/components/derisk/*`
- `frontend/lib/api/derisk.ts`, `frontend/hooks/useDeRisk.ts`, `frontend/types/derisk.ts`

**Reference:**
- `prospect_derisk_module/` — golden-master fixtures and validated reference scripts

## Data Model

| Table | Purpose |
|-------|---------|
| `holdings_snapshots` | Versioned statement ingest per advisory `Portfolio` |
| `lots` | Tax lots with cost basis, MV, stress beta |
| `derisk_assumptions` | Editable rates, drawdowns, tax budgets or beta targets |
| `derisk_analysis_runs` | Persisted analysis JSON + metadata |
| `derisk_sell_tiers` / `derisk_sell_tier_lots` | Normalized tier menu rows |

## API Contract

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/de-risk/clients` | Client/portfolio dropdown options |
| `GET` | `/api/v1/de-risk/portfolios/{id}/holdings` | Latest holdings snapshot |
| `POST` | `/api/v1/de-risk/portfolios/{id}/holdings` | Upload JSON or CSV statement |
| `GET/PUT` | `/api/v1/de-risk/portfolios/{id}/assumptions` | Read/update assumptions |
| `POST` | `/api/v1/de-risk/portfolios/{id}/analysis` | Run engine |
| `GET` | `/api/v1/de-risk/analysis/{run_id}/tiers` | Tier menu |
| `GET` | `/api/v1/de-risk/analysis/{run_id}/sell-list` | Sell list |
| `GET` | `/api/v1/de-risk/analysis/{run_id}/lots` | Per-lot decision analytic |

## Tier Modes

- **Taxable** (`tier_mode = tax_budget`): greedy lot selection capped by configurable tax budgets (default $250K / $500K / $750K).
- **Non-taxable** (`traditional_ira`, `roth_ira`, `401k`): beta-reduction target tiers (default 0.60 / 0.50 / 0.40).

## Upload Formats

1. **JSON** — `corrected_portfolio.json` shape (`positions` + `summary` + lots).
2. **CSV** — columns: `ticker`, `quantity`, `unit_cost` or `total_cost`, `trade_date`, `holding_period`, optional `name`, `section`, `current_price`.

Broker-specific parsers live under `backend/app/services/derisk/parsers/` (Morgan Stanley plugin planned).

## Verify

```bash
cd backend
pytest tests/test_derisk_golden.py tests/test_derisk_api.py -v
```

Golden acceptance (taxable trust fixture): $250K tax → 108 lots → beta 0.7614 → 0.5094.

## Depends On

- Module 14 (Client workspace — portfolio dropdown)
- Tiingo price/beta fetcher (future enrichment on CSV uploads)

## See Also

- `prospect_derisk_module/BUILD_GUIDE.md` — original module spec

# Module 18 — Prospect De-Risk Analyzer

**Phase 2 (Finesse advisory) · Risk Dashboard**

Build guide for adding a prospect portfolio de-risking feature to the Risk Dashboard
app. This module takes a prospect's concentrated, low-basis taxable portfolio and
produces a **menu of tax-budget de-risking options** — for each tax level the prospect
is willing to pay, the exact lots to sell, ranked by market-risk removed per tax dollar.

This document is written to be handed to Cursor. Pair it with the `engine/` reference
scripts and the `fixtures/` golden-master data in this folder. Match the conventions of
the existing `docs/modules/10–17` Phase 2 docs when you wire it in.

---

## 1. Objective

Given a prospect portfolio (positions + tax lots with cost basis), and a set of
assumptions (trust tax rates, drawdown scenarios, distribution rate), produce:

1. **The menu** — three (configurable) tax-budget tiers. For each tier: lots sold,
   proceeds raised to cash, tax paid, portfolio beta before/after, cash % after,
   distribution runway, and downside protection bought at -20/-30/-40%.
2. **The sell list** — the specific positions and lots that make up each tier, ranked
   by exposure-removed-per-tax-dollar (loss/zero-tax "harvest" lots first), tagged with
   the cheapest tier at which each lot is sold (tiers are cumulative).

The selection rule is fixed and defensible: **maximum market-risk reduction per realized
tax dollar, capped by a tax budget.** The prospect chooses how much tax to pay; the model
chooses which assets achieve the most de-risking for that budget.

Out of scope for the app: the Excel/Word client deliverables (those are a separate
desktop export, not part of the dashboard).

---

## 2. Architecture fit

The app stack already matches the reference engine, so this is a **port, not a rewrite**:

| Concern | App already has | Reference engine uses |
|---|---|---|
| Backend | FastAPI, pandas, numpy, scipy, **PyPortfolioOpt** | plain Python, numpy, scipy |
| Prices / betas | **Tiingo** fetcher (ETF proxies) | Tiingo (`fetch_market_data.py`) |
| Optimization | PyPortfolioOpt frontier | `optimize_portfolio.py` |
| Storage | SQLite + SQLAlchemy | flat JSON files |
| Frontend | Next.js 15, Tremor, Recharts, TanStack Query | n/a (Excel) |

**Reuse, do not duplicate:** the app's existing Tiingo price fetcher and PyPortfolioOpt
frontier code should back this module. Only the *trust-tax decision math* is new.

---

## 3. Reference engine → backend services

Port the `engine/` scripts into `backend/services/prospect/` as **pure functions**
(`(lots, assumptions) -> result`, no file I/O, no module-level globals). The JSON
read/write in the reference scripts is scaffolding — replace it with function args and
SQLAlchemy persistence.

| Reference script | New service module | Responsibility |
|---|---|---|
| `parser_morgan_stanley.py`, `excel_to_json.py` | `ingestion.py` | Statement/xlsx upload → positions + tax lots |
| `fetch_market_data.py` | *(reuse app's Tiingo fetcher)* | Prices for ETF proxies |
| `analyze_risk.py` | `risk.py` | Stress betas (Blume-adjusted, floor) |
| `optimize_portfolio.py` | *(reuse app's PyPortfolioOpt)* | Efficient frontier (optional context) |
| `tax_engine.py` | `tax.py` | Per-lot tax at trust marginal rates |
| `decision_analysis.py` | `decision.py` | Per-lot breakeven drawdown + exposure-per-tax-$ |
| `build_sell_tiers.py` | `tiers.py` | Greedy selection per tax budget; tier aggregates |
| `build_sell_list.py` | `sell_list.py` | Tier-tag each lot; position + lot rollups |

### Core math to preserve exactly

**Tax to sell a lot** (marginal, because the trust already realizes millions, so each
gain dollar stacks at the top of the compressed brackets):

```
tax = gain * (LT_RATE if long_term else ST_RATE)
LT_RATE = fed_ltcg + niit + state      # default 0.20 + 0.038 + 0.044 = 0.282
ST_RATE = fed_stcg + niit + state      # default 0.37 + 0.038 + 0.044 = 0.452
```

**Risk dollars / protection:** `beta_dollars = market_value * stress_beta`.
Loss avoided in a drawdown `d` = `beta_dollars * d`.

**Breakeven drawdown** (how big a drop justifies paying the tax now):
`breakeven = tax / beta_dollars`.

**Ranking (the heart of the feature):** sort lots so loss/zero-tax lots come first
(infinite efficiency), then by `beta_dollars / tax` descending:

```python
def eff(lot):
    t  = lot.tax_to_sell           # marginal
    bd = lot.market_value * lot.stress_beta
    if t <= 0:
        return (0, -bd)            # group 0: harvest/free, biggest exposure first
    return (1, -(bd / t))          # group 1: most exposure per tax dollar
```

**Greedy fill per budget:** walk the ranked list; add a lot if cumulative tax stays
within the budget, else skip and keep scanning smaller lots. Tiers are **cumulative** —
the $500K plan = the $250K lots plus the next block.

**Proceeds mechanics:** selling moves market value to cash; tax is paid out of the
portfolio. `new_total = old_total - tax_paid`; `new_cash = old_cash + (proceeds - tax_paid)`.

---

## 4. Data model (SQLAlchemy)

```
Prospect(id, name, account_type, created_at)
Portfolio(id, prospect_id FK, statement_date, source, total_value, cash_value)
Lot(id, portfolio_id FK, ticker, name, section, trade_date, holding_period,
    quantity, market_value, total_cost, unrealized_gl, stress_beta)
Assumptions(id, portfolio_id FK, lt_rate, st_rate, fed_ltcg, fed_stcg, niit, state,
    dd1, dd2, dd3, mm_yield, beta_floor, beta_method, dist_rate, tax_budgets_json)
AnalysisRun(id, portfolio_id FK, assumptions_id FK, created_at, beta_before)
SellTier(id, run_id FK, budget, n_lots, proceeds, gross_tax, net_tax_incl_harvest,
    beta_after, new_cash_pct, runway_after, protect_dd20, protect_dd30, protect_dd40)
SellTierLot(id, tier_id FK, lot_id FK, entry_tier, beta_dollars_removed,
    tax_to_sell, exposure_per_tax_dollar)
```

`Assumptions` is the editable "blue inputs" surface — every value the prospect/advisor
can change lives here, and editing it triggers a fresh `AnalysisRun`.

---

## 5. API (FastAPI)

```
POST   /api/prospects                      → create prospect
POST   /api/prospects/{id}/portfolio       → upload statement/xlsx; parse to lots
GET    /api/portfolios/{id}/assumptions    → current assumptions
PUT    /api/portfolios/{id}/assumptions    → edit (rates, scenarios, tax budgets)
POST   /api/portfolios/{id}/analysis       → run engine → AnalysisRun
GET    /api/analysis/{id}/tiers            → the menu (tier aggregates)
GET    /api/analysis/{id}/sell-list        → per-tier positions + full lot detail
GET    /api/analysis/{id}/lots             → per-lot decision analytic (breakeven etc.)
```

Response shapes should mirror `fixtures/sell_tiers.json` (the menu) and
`fixtures/sell_list.json` (`tier_summary`, `incremental_positions`, `sold_lots`).

---

## 6. Frontend (Next.js / Tremor / Recharts)

Route `app/prospects/[id]/page.tsx`, fetched via TanStack Query:

- **Tier menu** — three Tremor KPI cards (one per tax budget) plus a "Hold all" baseline:
  beta before→after, tax paid, cash % after, runway. Selecting a card filters the sell
  list below.
- **Protection vs. tax chart** — Recharts grouped bar: tax paid vs. downside protection
  bought at -30% for each tier (shows diminishing returns past the first tier).
- **Sell list table** — position-level rollup for the selected tier (ticker, lots, market
  value, unrealized gain, tax, beta-$ removed, exposure-per-tax-$), expandable to lot
  detail. Sort default = exposure-per-tax-$ descending.
- **Assumptions panel** — editable inputs (trust rates, drawdown scenarios, tax budgets);
  on save, `PUT` assumptions then re-run and invalidate the queries.

---

## 7. Testing — golden master

The `fixtures/` folder contains **validated** inputs and outputs from the reference run.
Use them as regression fixtures so the port is provably correct, not just plausible.

Input fixtures: `corrected_portfolio.json`, `tax_analysis.json`.
Expected outputs: `decision_analysis.json`, `sell_tiers.json`, `sell_list.json`.

Pin these acceptance numbers (portfolio total ≈ $11.07M, cash ≈ $1.71M, hold-all beta
0.7614):

| Tax budget | Lots sold | Tax paid | Proceeds | Beta after |
|---|---|---|---|---|
| $250,000 | 108 | $249,998 | $3,311,269 | 0.5094 |
| $500,000 | 130 | $499,946 | $4,595,402 | 0.3850 |
| $750,000 | 158 | $749,929 | $5,659,697 | 0.2807 |

A passing port reproduces these (within rounding) from the input fixtures. Write the unit
test against the pure `tiers.py` / `sell_list.py` functions before wiring the API.

---

## 8. Build sequence (suggested Cursor prompts, one per step)

1. SQLAlchemy models + migration (§4).
2. `tax.py` + `decision.py` pure functions; unit test vs. `decision_analysis.json`.
3. `tiers.py` + `sell_list.py`; unit test vs. the §7 acceptance table.
4. `ingestion.py` (upload → lots); reuse app's Tiingo fetcher for prices/betas.
5. FastAPI routers (§5) + response schemas.
6. Frontend route, cards, chart, table, assumptions panel (§6).
7. Wire assumptions edit → re-run → query invalidation.
8. End-to-end check: upload sample portfolio, confirm the menu matches §7.

---

## 9. Caveats / confirm

- Tax rates are **assumptions** — confirm with the trust's CPA. Defaults are 2026
  estimates (Colorado state). NIIT applies above the ~$15,950 trust threshold.
- Stress betas use Blume adjustment (`0.67*raw + 0.33`) with a floor (default 0.35); no
  holding is modeled as rising in a broad selloff.
- The reference scripts compute tax in Python with the rates hardcoded; in the app these
  must come from the `Assumptions` row so the UI can drive them.
- Greedy selection is near-optimal for this objective, not provably optimal; it is the
  defensible, explainable choice for client-facing advice. Do not silently swap in a
  solver without preserving the explainability.

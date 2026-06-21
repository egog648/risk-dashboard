# Module 08 — Portfolio Optimizer

## Goal
Interactive efficient frontier: user adjusts allocation sliders, optimizer returns the
frontier curve, max Sharpe portfolio, min vol portfolio, and a Monte Carlo scatter.

## Files Involved

**Backend:**
- `backend/app/api/v1/endpoints/portfolio.py` — POST `/api/v1/portfolio/frontier`
- `backend/app/services/risk/efficient_frontier.py` — Core optimizer
- `backend/app/services/risk/expected_returns.py` — Shared expected return assumptions

**Frontend:**
- `frontend/app/portfolio/page.tsx`
- `frontend/components/dashboard/EfficientFrontierChart.tsx`
- `frontend/components/portfolio/AllocationSliders.tsx`
- `frontend/components/portfolio/FrontierControls.tsx`
- `frontend/components/portfolio/PortfolioSelector.tsx`
- `frontend/components/portfolio/PortfolioComparisonPanel.tsx`
- `frontend/hooks/useEfficientFrontier.ts`
- `frontend/lib/api/portfolio.ts`
- `frontend/lib/profiler/mapProfileToPortfolioWeights.ts` — client profile → weights prefill

## API Contract

**Request:**
```
POST /api/v1/portfolio/frontier?high_detail=false
Content-Type: application/json

{
  "weights": {
    "equities_large": 0.20,
    "equities_mid": 0.05,
    "equities_small": 0.05,
    "credit_government": 0.20,
    "credit_corporate_ig": 0.10,
    "credit_corporate_hy": 0.00,
    "hard_assets_gold": 0.10,
    "hard_assets_reits": 0.10,
    "hard_assets_commodities": 0.05,
    "cash": 0.15
  },
  "suggested_weights": { ... }
}
```

**Query params:**
- `high_detail` (default `false`) — when `true`, uses 50 frontier points and 2000 Monte Carlo samples (default: 25 / 500).

**Legacy body:** A flat `PortfolioWeights` object (without `weights` wrapper) is still accepted for backward compatibility.

**Optional `suggested_weights`:** When provided, response includes a `suggested` frontier point for comparison (used by client portfolio workflow).

**Response:** `EfficientFrontierResponse`
```json
{
  "frontier": [{"expected_return": 0.08, "volatility": 0.12, "sharpe": 0.50, "weights": {...}}, ...],
  "max_sharpe": {...},
  "min_vol": {...},
  "current": {...},
  "monte_carlo": [...],
  "correlation_matrix": {...},
  "suggested": {...}
}
```

## Expected Returns Model

Returns are **fundamental-based**, not historical mean. Shared logic lives in `backend/app/services/risk/expected_returns.py` (also consumed by asset class metrics). See `05_RISK_ENGINE.md` for each formula.

This means the frontier reflects current market conditions (valuation, yields, spreads)
rather than being anchored to past return periods that may not repeat.

## Covariance Model

Uses **EWMA** (exponentially weighted moving average) with span=252 days.
More recent data has higher weight. This makes the covariance more responsive to
current market regimes (e.g., elevated cross-asset correlations in a crisis).

The endpoint reuses `mu` and `cov` from `build_frontier` for both current and suggested portfolio evaluation (log returns via `compute_returns`).

## Optimization Constraints

Configured in `efficient_frontier.py`:
```python
weight_bounds=(0.0, 0.60)   # 0–60% per asset
```

The weights from the request are used as the "current" portfolio point.
They are normalized to sum to 1 if they don't already.

## UI Layout

The portfolio page shows:
1. **PortfolioSelector** (top) — load a saved client portfolio or use manual weights
2. **AllocationSliders** (left column) — weight inputs and Run Optimizer button
3. **EfficientFrontierChart** (right column) — frontier curve, Monte Carlo scatter, reference dots
4. **FrontierControls** (below chart) — numeric summary cards for Max Sharpe, Min Vol, Current
5. **PortfolioComparisonPanel** — current vs suggested allocation when client portfolio loaded
6. **CorrelationHeatmap** (full width below) — pairwise correlations from the frontier response

## Optimizer run behavior

- **Bare `/portfolio`:** No API call until user clicks **Run Optimizer**.
- **`?prefill=1` or client portfolio selected:** Auto-runs frontier with loaded weights.
- Client profile weights can be mapped via `mapProfileToPortfolioWeights` before prefill.

## Extending the Optimizer

To add a new asset to the optimizer:
1. Add the new ticker to `ASSET_TICKERS` in `portfolio.py`
2. Add the expected return calculation in `expected_returns.py`
3. Add the weight field to `PortfolioWeights` in `backend/app/models/schemas.py`
4. Add corresponding field to `frontend/types/portfolio.ts` and `WEIGHT_LABELS`

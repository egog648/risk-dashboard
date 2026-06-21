# Module 08 — Portfolio Optimizer

## Goal
Interactive efficient frontier: user adjusts allocation sliders, optimizer returns the
frontier curve, max Sharpe portfolio, min vol portfolio, and a Monte Carlo scatter.

## Files Involved

**Backend:**
- `backend/app/api/v1/endpoints/portfolio.py` — POST `/api/v1/portfolio/frontier`
- `backend/app/services/risk/efficient_frontier.py` — Core optimizer

**Frontend:**
- `frontend/app/portfolio/page.tsx`
- `frontend/components/dashboard/EfficientFrontierChart.tsx`
- `frontend/components/portfolio/AllocationSliders.tsx`
- `frontend/components/portfolio/FrontierControls.tsx`
- `frontend/hooks/useEfficientFrontier.ts`
- `frontend/lib/api/portfolio.ts`

## API Contract

**Request:**
```
POST /api/v1/portfolio/frontier
Content-Type: application/json

{
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
}
```

**Response:** `EfficientFrontierResponse`
```json
{
  "frontier": [{"expected_return": 0.08, "volatility": 0.12, "sharpe": 0.50, "weights": {...}}, ...],
  "max_sharpe": {...},
  "min_vol": {...},
  "current": {...},
  "monte_carlo": [...],
  "correlation_matrix": {...}
}
```

## Expected Returns Model

Returns are **fundamental-based**, not historical mean. See `05_RISK_ENGINE.md` for each formula.

This means the frontier reflects current market conditions (valuation, yields, spreads)
rather than being anchored to past return periods that may not repeat.

## Covariance Model

Uses **EWMA** (exponentially weighted moving average) with span=252 days.
More recent data has higher weight. This makes the covariance more responsive to
current market regimes (e.g., elevated cross-asset correlations in a crisis).

## Optimization Constraints

Configured in `efficient_frontier.py`:
```python
weight_bounds=(0.0, 0.60)   # 0–60% per asset
```

The weights from the request are used as the "current" portfolio point.
They are normalized to sum to 1 if they don't already.

## UI Layout

The portfolio page shows:
1. **AllocationSliders** (left column) — weight inputs and Run Optimizer button
2. **EfficientFrontierChart** (right column) — frontier curve, Monte Carlo scatter, reference dots
3. **FrontierControls** (below chart) — numeric summary cards for Max Sharpe, Min Vol, Current
4. **CorrelationHeatmap** (full width below) — pairwise correlations from the frontier response

## Extending the Optimizer

To add a new asset to the optimizer:
1. Add the new ticker to `ASSET_TICKERS` in `portfolio.py`
2. Add the expected return calculation in `_get_expected_returns()`
3. Add the weight field to `PortfolioWeights` in `backend/app/models/schemas.py`
4. Add corresponding field to `frontend/types/portfolio.ts` and `WEIGHT_LABELS`

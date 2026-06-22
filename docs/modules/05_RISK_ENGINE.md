# Module 05 — Risk Engine

## Goal
A library of composable risk functions used by all asset class modules.

## Files Involved
- `backend/app/services/risk/metrics.py`
- `backend/app/services/risk/cycle_analysis.py`
- `backend/app/services/risk/fundamental_scoring.py`
- `backend/app/services/risk/expected_returns.py`
- `backend/app/services/risk/return_assumptions.py`
- `backend/app/data/return_assumptions.yaml`
- `backend/app/services/data_fetchers/shiller_client.py`
- `backend/app/services/risk/efficient_frontier.py`

---

## `metrics.py` — Risk Metrics

All functions accept a pandas Series of prices and return floats.

| Function | Description |
|---|---|
| `compute_returns(prices)` | Log or simple daily returns |
| `realized_volatility(prices, window=63)` | Annualized vol over rolling window |
| `sharpe_ratio(prices, risk_free, window=252)` | Annualized Sharpe |
| `sortino_ratio(prices, risk_free, window=252)` | Sortino (downside deviation) |
| `max_drawdown(prices)` | Peak-to-trough drawdown fraction |
| `value_at_risk(prices, confidence=0.95)` | Historical VaR |
| `conditional_var(prices, confidence=0.95)` | CVaR / Expected Shortfall |
| `compute_risk_score(vol, max_dd, var_99, val_z)` | Composite 0–100 risk score |

### Composite Risk Score Breakdown
```
Vol component (0–25 pts):    0% vol = 0,  40%+ = 25
Drawdown component (0–25):   0% = 0,  -60%+ = 25
VaR component (0–25):        0% = 0,  -5% daily = 25
Valuation component (0–25):  z=-3 = 0, z=+3 = 25
```

---

## `cycle_analysis.py` — Cycle Phase Detection

Four cycle phases: `expansion | peak | contraction | trough`

| Function | Inputs | Logic |
|---|---|---|
| `detect_equity_cycle` | yield curve, VIX, SP500 | Yield curve + momentum + vol |
| `detect_credit_cycle` | HY spread, IG spread, yield curve | Spread level + direction |
| `detect_inflation_cycle` | CPI, breakeven | CPI YoY + breakeven level |
| `detect_cash_cycle` | Fed Funds, real rate | Hiking/cutting + real rate regime |

---

## `fundamental_scoring.py` — Valuation & Expected Returns

### Valuation Z-Score
```python
valuation_zscore(current_value, historical_series, window_years=20)
```
Returns -3 to +3 (clipped). Positive = expensive. Negative = cheap.

### Expected Return Estimates (Forward-Looking, Fundamentals-Based)
| Function | Model |
|---|---|
| `equity_expected_return` | Earnings yield + long-run growth + inflation |
| `credit_expected_return` | YTM + spread – expected default losses |
| `gold_expected_return` | CPI inflation + negative real rate premium |
| `reit_expected_return` | Dividend yield + NAV growth – rate drag |
| `cash_expected_return` | T-bill yield – CPI inflation (real return) |

### Expected Return Resolver (`expected_returns.py`)
- `resolve_return_inputs(db)` — live Shiller CAPE, Tiingo VNQ dividend yield, registry coefficients
- `compute_expected_return(key, ctx, inputs)` — per canonical weight key
- `build_portfolio_expected_returns(db)` — all optimizer keys
- `build_asset_class_expected_return(db, key)` — shared path for asset-class cards

Assumptions version traceable via `GET /api/v1/data-status` → `assumptions_version`.

---

## Asset Card Calculation Pipeline (Design)

Each dashboard **asset card** (`AssetClassCard`) renders one `AssetClassMetrics` payload from `GET /api/v1/{asset-class}/{sub-class}` or `/all`. All sub-classes share the pipeline in `AssetClassBase` (`backend/app/services/asset_classes/base.py`).

### Data flow

```
Tiingo ETF prices (proxy ticker)  ──┐
FRED macro series                 ──┼──► sub-class get_metrics()
Shiller CAPE (large cap only)     ──┘         │
                                              ▼
                         build_standard_risk_stats()     ← historical (price-based)
                         build_asset_class_expected_return() ← forward-looking (fundamental)
                         detect_*_cycle()               ← macro regime label
                         valuation_zscore()             ← 20y z-score on price/yield/spread
                                              ▼
                         compute_risk_score()           ← composite 0–100
                         AssetClassMetrics response
```

### Per-field truth table

| Card field | Source | Method | Notes |
|---|---|---|---|
| **Realized vol** | ETF daily prices | `realized_volatility(prices, window=63)` | ~3-month annualized log-return vol |
| **Sharpe / Sortino** | ETF prices + FRED T-bill | `sharpe_ratio` / `sortino_ratio` (252d window) | **Historical** excess return over live risk-free rate |
| **Max drawdown, VaR, CVaR** | ETF prices | `max_drawdown`, `value_at_risk`, `conditional_var` | Historical tail risk |
| **Expected return** | Fundamentals + macro | `build_asset_class_expected_return(db, key)` | **Forward-looking**; same resolver as portfolio optimizer μ |
| **Valuation score (z)** | Price/yield/spread history | `valuation_zscore(current, series, 20y)` | −3 cheap … +3 expensive |
| **Risk score (0–100)** | Composite | `compute_risk_score(vol, max_dd, var_99, val_z)` | Four 0–25 components (see above) |
| **Cycle phase** | FRED macro only | `detect_equity_cycle` / `detect_credit_cycle` / etc. | **Display-only** today — does not adjust expected return |
| **Implied vol** | VIX (equities only) | Latest VIX / 100 | Optional overlay on equity cards |

### Expected return by sub-class (shared with optimizer)

| Sub-class | Proxy ETF | Expected return model |
|---|---|---|
| Large / mid / small cap | SPY / MDY / IWM | Shiller earnings yield + size premium + CPI + real growth |
| Govt / IG / HY credit | TLT / LQD / HYG | 10Y yield + OAS spread − default loss |
| Gold / commodities | GLD / DBC | CPI + real-rate premium (commodities reuse gold proxy) |
| REITs | VNQ | Trailing dividend yield + NAV growth − rate drag |
| Cash | SHY | T-bill − CPI (real yield) |

### Cycle phase rules (current implementation)

**Equities** (`detect_equity_cycle`): T10Y2Y, VIX, S&P 500 momentum.

| Condition | Phase |
|---|---|
| T10Y2Y > 0.5%, 12M momentum > 10%, VIX < 20 | expansion |
| T10Y2Y > 0%, 12M momentum > 0%, VIX ≥ 20 | peak |
| T10Y2Y < 0, 3M momentum < 0 | contraction |
| T10Y2Y < 0, 3M momentum > 0 | trough |
| **Fallback** (no rule matched) | expansion if 12M momentum > 0, else contraction |

The fallback explains cases where macro looks late-cycle (flat/inverted curve, rich valuations) but **positive 12-month price momentum** still yields `expansion`. Tightening this fallback (e.g. require valuation z-score or cap momentum weight) is a planned improvement — see `METHODOLOGY.md` §6 scenario adjustments.

**Credit** (`detect_credit_cycle`): HY OAS level and 3M direction. FRED OAS series are in **percent** (e.g. 4.5 = 4.5%), not basis points. Thresholds: `< 4.0` expansion, `< 5.0` peak, `> 5.0` widening → contraction, `> 6.0` tightening → trough.

**Hard assets** (`detect_inflation_cycle`): CPI YoY + 10Y breakeven.

**Cash** (`detect_cash_cycle`): Fed Funds direction + real rate sign.

### Parity with portfolio optimizer

| Input | Asset cards | Portfolio optimizer |
|---|---|---|
| Expected return μ | `build_asset_class_expected_return` | `build_portfolio_expected_returns` (same `compute_expected_return`) |
| Vol / Sharpe on card | Historical from ETF prices | Portfolio vol from EWMA covariance + fundamental μ |
| Cycle phase | Shown on card | **Not wired** to μ or frontier (spec-only in METHODOLOGY §6) |
| Risk-free rate | Live FRED DTB3 | Live FRED DTB3 (frontier Sharpe evaluation) |

### Known gaps / next design work

1. **Scenario-adjusted returns** — valuation × cycle multipliers on expected return (METHODOLOGY §6, not implemented).
2. **Equity cycle fallback** — too permissive when momentum is positive but curve is flat/inverted; consider `peak` when valuation z > 1.5 and VIX elevated.
3. **Sharpe inconsistency** — card Sharpe is historical; frontier Sharpe uses fundamental μ. Document both on UI or align labels.
4. **Commodities expected return** — currently reuses gold formula; needs independent proxy when data available.

---

## `efficient_frontier.py` — Portfolio Optimizer

Uses **PyPortfolioOpt** + **scipy.optimize**.

### Key Design Choices
- **Expected returns**: Fundamental-based (not historical mean)
- **Covariance**: EWMA (span=252 days, more weight to recent data)
- **Constraints**: Long-only, weights sum to 1, max 60% per asset
- **Monte Carlo**: 2,000 random portfolios for scatter visualization

### Output
```python
{
  "frontier": [...],          # Points on the efficient frontier curve
  "max_sharpe": {...},        # Maximum Sharpe (capped at governor vol when constrained)
  "min_vol": {...},           # Minimum volatility portfolio
  "suggested": {...},         # Best return at governor max_portfolio_vol (when constraints set)
  "monte_carlo": [...],       # Random long-only portfolios
  "correlation_matrix": {...} # EWMA-derived pairwise correlations (string asset keys)
}
```

**2026-06-22 fix:** EWMA covariance from pandas uses a MultiIndex; normalize to plain asset labels before building `correlation_matrix` (prevents Pydantic 500 on `/portfolio/frontier`).

### Tuning
To adjust optimization constraints, edit `build_frontier()` in `efficient_frontier.py`:
```python
weight_bounds=(0.0, 0.60)  # min/max weight per asset
```

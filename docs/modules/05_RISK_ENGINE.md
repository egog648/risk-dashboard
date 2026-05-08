# Module 05 — Risk Engine

## Goal
A library of composable risk functions used by all asset class modules.

## Files Involved
- `backend/app/services/risk/metrics.py`
- `backend/app/services/risk/cycle_analysis.py`
- `backend/app/services/risk/fundamental_scoring.py`
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
| `correlation_matrix(price_dict)` | Pairwise correlation DataFrame |
| `ewma_covariance(price_dict, span=252)` | EWMA covariance matrix (annualized) |
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
  "frontier": [...],          # 50 points on the efficient frontier curve
  "max_sharpe": {...},        # Maximum Sharpe portfolio
  "min_vol": {...},           # Minimum volatility portfolio
  "monte_carlo": [...],       # 2000 random portfolios
  "correlation_matrix": {...} # Pairwise correlations
}
```

### Tuning
To adjust optimization constraints, edit `build_frontier()` in `efficient_frontier.py`:
```python
weight_bounds=(0.0, 0.60)  # min/max weight per asset
```

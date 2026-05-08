# Risk Dashboard — Methodology Reference

This document explains every calculation in the risk engine. Use it as the source of truth when modifying or extending the models.

---

## 1. Data Sources

| Series | Source | Used For |
|---|---|---|
| SPY, MDY, IWM, TLT, IEF, LQD, HYG, GLD, VNQ, DBC, SHY | Tiingo (daily adjusted close) | Price-based risk metrics |
| SP500, VIXCLS | FRED | Equity cycle detection |
| DGS2, DGS10, DGS30, T10Y2Y | FRED | Credit metrics, yield curve |
| BAMLH0A0HYM2, BAMLC0A0CM | FRED | Credit spread metrics |
| FEDFUNDS, DTB3, SOFR | FRED | Risk-free rate, cash metrics |
| CPIAUCSL, T10YIE | FRED | Inflation metrics, real rates |
| DCOILWTICO, CSUSHPISA | FRED | Hard asset context |

All data is cached in SQLite and refreshed daily. The cache TTL is 23 hours — within that window, all metric endpoints serve from the DB with zero external API calls.

---

## 2. Risk Metrics

Computed in `backend/app/services/risk/metrics.py`. All metrics operate on daily price series (pandas Series).

### Returns
Log returns are used throughout:
```
r_t = ln(P_t / P_{t-1})
```

### Realized Volatility
Rolling 63-day (≈ 3-month) window, annualized:
```
vol = std(r, window=63) × √252
```

### Sharpe Ratio
252-day trailing window:
```
Sharpe = (mean(r) × 252 − risk_free_rate) / (std(r) × √252)
```
`risk_free_rate` is the current 3-month T-bill (DTB3), expressed as a decimal.

### Sortino Ratio
Same as Sharpe but denominator uses downside deviation only:
```
downside_dev = std(r[r < 0]) × √252
Sortino = (mean(r) × 252 − risk_free_rate) / downside_dev
```

### Max Drawdown
Full history, peak-to-trough:
```
drawdown_t = (P_t − max(P_{1..t})) / max(P_{1..t})
Max Drawdown = min(drawdown_t)
```
Returns a negative fraction (e.g. −0.55 = −55% drawdown).

### Value at Risk (VaR)
Historical simulation, 252-day window:
```
VaR_95 = 5th percentile of daily log returns
VaR_99 = 1st percentile of daily log returns
```

### Conditional VaR (CVaR / Expected Shortfall)
Mean of all returns below the VaR threshold:
```
CVaR_95 = mean(r[r ≤ VaR_95])
```
Represents the average loss in the worst 5% of days.

### Composite Risk Score (0–100)
Four equally-weighted components, each capped at 25 points:

| Component | Formula | 0 pts | 25 pts |
|---|---|---|---|
| Volatility | `min(vol / 0.40 × 25, 25)` | 0% vol | 40%+ vol |
| Max Drawdown | `min(|drawdown| / 0.60 × 25, 25)` | 0% dd | 60%+ dd |
| VaR 99 | `min(|VaR99| / 0.05 × 25, 25)` | 0% | 5%+ daily |
| Valuation | `(valuation_z + 3) / 6 × 25` | z = −3 (cheap) | z = +3 (expensive) |

Higher score = more risk. The score is not a prediction — it's a relative risk gauge.

---

## 3. Valuation Z-Score

Computed in `backend/app/services/risk/fundamental_scoring.py`.

```
z = (current_price − mean(history_20Y)) / std(history_20Y)
z = clip(z, −3, +3)
```

Interpretation:
- `z = 0` → historically fair
- `z = +3` → extremely expensive (top of 20-year range)
- `z = −3` → extremely cheap (bottom of 20-year range)

This feeds directly into the risk score (expensive = higher risk score) and is the primary input for the planned valuation-adjusted expected return model (see Section 6).

---

## 4. Expected Returns (Base Case)

Computed in `backend/app/services/risk/fundamental_scoring.py`. These are **fundamental-based forward estimates**, not historical mean returns. This distinction matters: historical means embed the valuation level at which you bought; these estimates are anchored to current economics.

### Equities — Gordon Growth Model
```
expected_return = earnings_yield + CPI_YoY/100 + 0.015
```
- `earnings_yield`: E/P ratio (inverse of P/E). Defaults: large cap 5.0%, mid 5.5%, small 6.5%
- `CPI_YoY`: trailing 12-month CPI inflation
- `0.015`: assumed long-run real earnings growth (≈ GDP trend)

**Limitation**: The earnings yield inputs are currently hardcoded approximations. A future improvement would pull live CAPE data from a source like Shiller's dataset and compute earnings yield dynamically.

### Credit — Yield-to-Maturity Minus Default Losses
```
expected_return = YTM + spread/100 − expected_default_loss
```
- `YTM`: 10-year Treasury yield (DGS10)
- `spread`: OAS spread in basis points (BAMLC0A0CM for IG, BAMLH0A0HYM2 for HY)
- `expected_default_loss`: 0.3% for IG, 2.5% for HY (long-run averages)

### Gold & Commodities — Inflation Hedge Model
```
real_rate_premium = max(−real_rate, 0) × 0.5
expected_return = CPI_YoY/100 + real_rate_premium
```
Gold performs best when real rates are negative. The `0.5` coefficient dampens the premium (empirical calibration).

### REITs — Dividend Yield + NAV Growth
```
rate_drag = max(risk_free_rate − 0.03, 0) × 0.5
expected_return = dividend_yield + 0.02 − rate_drag
```
- `dividend_yield`: hardcoded at 4.5% (approximate long-run REIT yield)
- `0.02`: assumed long-run real NAV growth
- `rate_drag`: rising rates compress REIT multiples

### Cash — Real Return
```
expected_return = T-bill_yield − CPI_YoY/100
```
Simple real yield. Negative when inflation exceeds the risk-free rate.

---

## 5. Cycle Detection

Computed in `backend/app/services/risk/cycle_analysis.py`. Each asset class has a separate detector using different macro indicators. Phases: `expansion`, `peak`, `contraction`, `trough`, `unknown`.

### Equities — `detect_equity_cycle(yield_curve, vix, sp500)`

Uses T10Y2Y (yield curve spread), VIX, and S&P 500 price momentum.

| Condition | Phase |
|---|---|
| T10Y2Y > 0.5%, 12M momentum > 10%, VIX < 20 | expansion |
| T10Y2Y > 0%, 12M momentum > 0%, VIX > 20 | peak |
| T10Y2Y < 0 (inverted), 3M momentum < 0 | contraction |
| T10Y2Y < 0 (inverted), 3M momentum > 0 | trough |
| Fallback | expansion if 12M > 0, else contraction |

### Credit — `detect_credit_cycle(hy_spread, ig_spread, yield_curve)`

Driven by HY spread level (absolute risk appetite) and 3-month direction (trend).

| Condition | Phase |
|---|---|
| HY < 400bps, tightening, curve positive | expansion |
| HY < 500bps, widening | peak |
| HY > 500bps, widening | contraction |
| HY > 600bps, tightening | trough |

### Hard Assets — `detect_inflation_cycle(cpi, breakeven)`

Inflation regime classification using CPI YoY and 10Y breakeven inflation.

| Condition | Phase |
|---|---|
| CPI > 4%, breakeven > 3% | peak |
| CPI > 2.5%, breakeven > 2.5% | expansion |
| CPI < 2%, breakeven < 2% | contraction |
| Otherwise | trough |

### Cash — `detect_cash_cycle(fed_funds, real_rate)`

Fed Funds direction (hiking/cutting) combined with real rate sign.

| Condition | Phase |
|---|---|
| Hiking + real rate < 0 | expansion |
| Hiking + real rate > 0 | peak |
| Not hiking + real rate > 0 | contraction |
| Cutting + real rate < 0 | trough |

---

## 6. Planned: Scenario-Adjusted Expected Returns

> **Status: Not yet implemented.** This section specs the planned feature.

### Motivation

The base case expected returns (Section 4) assume mean-reverting economics but ignore the *current entry point*. An investor buying equities today at a high CAPE and high volatility faces a different return distribution than the historical average suggests. This feature makes that adjustment explicit, with user-controlled scenario toggles.

### Framework

Expected return under a scenario is the base case adjusted by two multipliers:

```
adjusted_return = base_return × valuation_adjustment × cycle_adjustment
```

#### Valuation Adjustment

Maps the current valuation z-score to a return multiplier. Expensive assets get penalized; cheap assets get a premium.

```
valuation_adjustment = 1 − (valuation_z × valuation_sensitivity)
```

| Scenario | `valuation_sensitivity` |
|---|---|
| Best Case | 0.05 (market ignores valuation) |
| Base Case | 0.10 (moderate mean reversion) |
| Worst Case | 0.20 (strong mean reversion) |

Example: equities at z = +2.5 (very expensive):
- Best case: `1 − (2.5 × 0.05)` = 0.875 → 12.5% haircut
- Base case: `1 − (2.5 × 0.10)` = 0.75 → 25% haircut
- Worst case: `1 − (2.5 × 0.20)` = 0.50 → 50% haircut

#### Cycle Adjustment

Applies a regime-based return multiplier derived from historical phase returns.

| Cycle Phase | Best Case | Base Case | Worst Case |
|---|---|---|---|
| expansion | 1.20 | 1.10 | 1.00 |
| peak | 1.00 | 0.85 | 0.65 |
| contraction | 0.80 | 0.60 | 0.30 |
| trough | 1.30 | 1.10 | 0.90 |

#### UI Toggle

Three scenario buttons: **Best / Base / Worst**. Changing the toggle re-computes `adjusted_return` on the frontend using the already-fetched `valuation_z`, `cycle_phase`, and `base_return` values — no additional API call required.

The adjusted return would be displayed alongside the base case as a range band on the asset class cards and as a separate series on the efficient frontier.

### Implementation Path

1. Add `scenario` parameter to `AssetClassMetrics` schema (or compute all three upfront and return them)
2. Add `valuation_adjustment()` and `cycle_adjustment()` functions to `fundamental_scoring.py`
3. Expose a `/api/v1/{asset-class}/scenarios` endpoint or add `best`/`base`/`worst` fields to existing metrics response
4. Add scenario toggle component to the frontend (three-button toggle, state lifted to page level)
5. Update `AssetClassCard` and `EfficientFrontierChart` to render scenario bands

---

## 7. Efficient Frontier

Computed in `backend/app/services/risk/efficient_frontier.py` via the `/api/v1/portfolio/frontier` endpoint.

- **Expected returns**: fundamental-based (Section 4), not historical means
- **Covariance**: EWMA with 252-day span (`ewm(span=252).cov() × 252`), giving more weight to recent correlations
- **Optimizer**: `PyPortfolioOpt` for max-Sharpe and min-vol points; `scipy.optimize` for the frontier curve
- **Monte Carlo**: 2,000 random weight draws plotted as a scatter cloud
- **Constraints**: long-only, weights sum to 1

---

## 8. Known Limitations & Future Improvements

| Limitation | Impact | Planned Fix |
|---|---|---|
| Earnings yields are hardcoded | Equities expected return is approximate | Pull live CAPE from Shiller dataset |
| REIT dividend yield is hardcoded at 4.5% | Slightly inaccurate | Fetch from FRED or Tiingo |
| Cycle thresholds are rule-based, not ML | May lag turning points | Regime model (HMM or logistic) |
| Valuation z-score uses price, not fundamentals | Trend-following bias | Use CAPE or P/B for equities |
| No forward vol adjustment | VaR uses historical window only | Incorporate VIX term structure |

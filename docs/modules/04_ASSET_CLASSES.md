# Module 04 — Asset Classes

## Goal
Each sub-asset class is an independent module that fetches its data, computes risk metrics,
and returns a standardized `AssetClassMetrics` response.

## Files Involved
- `backend/app/services/asset_classes/base.py` — Abstract base class
- `backend/app/services/asset_classes/equities/large_cap.py`
- `backend/app/services/asset_classes/equities/mid_cap.py`
- `backend/app/services/asset_classes/equities/small_cap.py`
- `backend/app/services/asset_classes/credit/government.py`
- `backend/app/services/asset_classes/credit/corporate.py`
- `backend/app/services/asset_classes/hard_assets/gold.py`
- `backend/app/services/asset_classes/hard_assets/reits.py`
- `backend/app/services/asset_classes/hard_assets/commodities.py`
- `backend/app/services/asset_classes/cash/money_market.py`

## Pattern

Every sub-asset class inherits from `AssetClassBase`:
```python
class MyAsset(AssetClassBase):
    asset_class = "equities"   # top-level category
    sub_class = "large_cap"    # sub-category key

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        # 1. Fetch price and macro data from cache
        prices = fetch_ticker("SPY", db)
        yield_curve = fetch_series("T10Y2Y", db)

        # 2. Compute risk metrics
        vol = metrics.realized_volatility(prices)
        sharpe = metrics.sharpe_ratio(prices, risk_free)

        # 3. Detect cycle phase
        cycle = cycle_analysis.detect_equity_cycle(yield_curve, vix, sp500)

        # 4. Compute fundamental valuation z-score
        val_z = fundamental_scoring.valuation_zscore(current, historical)

        # 5. Compute composite risk score
        risk_score = metrics.compute_risk_score(vol, drawdown, var99, val_z)

        # 6. Return standardized response
        return AssetClassMetrics(...)
```

## Current Sub-Classes

| Asset Class | Sub-class | Ticker | Key Indicators |
|---|---|---|---|
| Equities | Large Cap | SPY | VIX, CAPE, yield curve |
| Equities | Mid Cap | MDY | VIX, yield curve |
| Equities | Small Cap | IWM | VIX, yield curve |
| Credit | Government | TLT | DGS10, yield curve |
| Credit | Corporate IG | LQD | IG spread, DGS10 |
| Credit | Corporate HY | HYG | HY spread, DGS10 |
| Hard Assets | Gold | GLD | Real rate, CPI, breakeven |
| Hard Assets | REITs | VNQ | Dividend yield, DGS10 |
| Hard Assets | Commodities | DBC | CPI, breakeven |
| Cash | Money Market | SHY | DTB3, Fed Funds, CPI |

## To add a new sub-asset class, see `09_EXTENDING.md`

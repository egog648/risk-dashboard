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

Every sub-asset class inherits from `AssetClassBase` and uses shared helpers:

| Helper | Purpose |
|---|---|
| `get_cpi_yoy(cpi)` | Year-over-year CPI percent |
| `get_risk_free(tbill)` | Annualized T-bill rate |
| `build_standard_risk_stats(prices, risk_free)` | Vol, Sharpe, Sortino, drawdown, VaR block |
| `build_ok_response(...)` | Assemble successful `AssetClassMetrics` |

```python
class MyAsset(AssetClassBase):
    asset_class = "equities"
    sub_class = "large_cap"

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        prices = fetch_ticker("SPY", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["SPY"])

        # Fetch class-specific macro series, then:
        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_equity_cycle(...),
            risk_free=self.get_risk_free(tbill),
            exp_return=fundamental_scoring.equity_expected_return(...),
            val_z=fundamental_scoring.valuation_zscore(...),
        )
```

Expected returns for the portfolio optimizer live in `backend/app/services/risk/expected_returns.py`.

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

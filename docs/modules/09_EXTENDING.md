# Module 09 — Extending the Dashboard

## Adding a New Sub-Asset Class

This walkthrough adds "International Developed Equities" as a new sub-class.
Follow this recipe for any new sub-class in under 15 minutes.

---

### Step 1 — Backend: Create the asset class module

Create `backend/app/services/asset_classes/equities/international_developed.py`:

```python
import pandas as pd
from sqlalchemy.orm import Session

from app.models.schemas import AssetClassMetrics, RiskMetrics, TimeSeriesPoint
from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, metrics, fundamental_scoring


class InternationalDevelopedEquities(AssetClassBase):
    asset_class = "equities"
    sub_class = "international_developed"

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        prices = fetch_ticker("EFA", db)   # iShares MSCI EAFE ETF
        vix = fetch_series("VIXCLS", db)
        yield_curve = fetch_series("T10Y2Y", db)
        sp500 = fetch_series("SP500", db)
        cpi = fetch_series("CPIAUCSL", db)
        tbill = fetch_series("DTB3", db)

        risk_free = float(tbill.iloc[-1]) / 100 if not tbill.empty else 0.04

        vol = metrics.realized_volatility(prices)
        sharpe = metrics.sharpe_ratio(prices, risk_free)
        sortino = metrics.sortino_ratio(prices, risk_free)
        drawdown = metrics.max_drawdown(prices)
        var95 = metrics.value_at_risk(prices, 0.95)
        var99 = metrics.value_at_risk(prices, 0.99)
        cvar = metrics.conditional_var(prices, 0.95)

        cpi_yoy = float(cpi.iloc[-1] / cpi.iloc[-12] - 1) * 100 if len(cpi) >= 12 else 2.5
        exp_return = fundamental_scoring.equity_expected_return(
            earnings_yield=0.065,   # Intl equities trade at discount historically
            cpi_yoy=cpi_yoy,
        )
        val_z = fundamental_scoring.valuation_zscore(float(prices.iloc[-1]), prices)
        risk_score = metrics.compute_risk_score(vol, drawdown, var99, val_z)
        cycle = cycle_analysis.detect_equity_cycle(yield_curve, vix, sp500)

        history = [
            TimeSeriesPoint(date=d, value=float(v))
            for d, v in prices.tail(756).items()
        ]

        return AssetClassMetrics(
            asset_class=self.asset_class,
            sub_class=self.sub_class,
            cycle_phase=cycle,
            risk_score=risk_score,
            metrics=RiskMetrics(
                realized_vol=round(vol, 4),
                implied_vol=round(float(vix.iloc[-1]) / 100, 4) if not vix.empty else None,
                sharpe_ratio=round(sharpe, 3) if not pd.isna(sharpe) else None,
                sortino_ratio=round(sortino, 3) if not pd.isna(sortino) else None,
                max_drawdown=round(drawdown, 4),
                var_95=round(var95, 4),
                var_99=round(var99, 4),
                cvar_95=round(cvar, 4),
                valuation_score=round(val_z, 3),
                expected_return=round(exp_return, 4),
            ),
            history=history,
            as_of=self._now(),
        )
```

---

### Step 2 — Backend: Register the ticker in yfinance_client

In `yfinance_client.py`, add to `YFINANCE_TICKERS`:
```python
"EFA": "International Developed Equities (MSCI EAFE)",
```

---

### Step 3 — Backend: Add the endpoint

In `backend/app/api/v1/endpoints/equities.py`:
```python
from app.services.asset_classes.equities.international_developed import InternationalDevelopedEquities

@router.get("/international", response_model=AssetClassMetrics)
def get_international(db: Session = Depends(get_db)):
    return InternationalDevelopedEquities().get_metrics(db)
```

Also add it to `get_all_equities()`:
```python
@router.get("/all", response_model=list[AssetClassMetrics])
def get_all_equities(db: Session = Depends(get_db)):
    return [
        LargeCapEquities().get_metrics(db),
        MidCapEquities().get_metrics(db),
        SmallCapEquities().get_metrics(db),
        InternationalDevelopedEquities().get_metrics(db),  # ← add this
    ]
```

---

### Step 4 — Frontend: No changes needed for overview

The overview page uses `fetchAllEquities()` → `GET /equities/all`.
The new sub-class will automatically appear in the grid once Step 3 is done.

---

### Step 5 — Frontend (optional): Add to portfolio optimizer

In `frontend/types/portfolio.ts`, add to `PortfolioWeights`:
```typescript
international: number;
```

Add to `WEIGHT_LABELS`:
```typescript
international: "Equities — International",
```

In `backend/app/models/schemas.py`, add to `PortfolioWeights`:
```python
international: float = 0.0
```

In `backend/app/api/v1/endpoints/portfolio.py`, add to `ASSET_TICKERS`:
```python
"international": "EFA",
```

---

### That's it. Total time: ~10 minutes.

The architecture is designed so that a new sub-class only touches:
1. One new file (the asset class module)
2. One line in the ticker registry
3. One import + one function call in the endpoint
4. Optional: Two lines in the frontend types for portfolio optimizer

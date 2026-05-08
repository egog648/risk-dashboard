import pandas as pd
from sqlalchemy.orm import Session

from app.models.schemas import AssetClassMetrics, RiskMetrics
from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, metrics, fundamental_scoring


class MidCapEquities(AssetClassBase):
    asset_class = "equities"
    sub_class = "mid_cap"

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        prices = fetch_ticker("MDY", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["MDY"])

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
        # Mid caps trade at slight premium to large caps in growth environments
        exp_return = fundamental_scoring.equity_expected_return(
            earnings_yield=0.055, cpi_yoy=cpi_yoy
        )
        val_z = fundamental_scoring.valuation_zscore(float(prices.iloc[-1]), prices)
        risk_score = metrics.compute_risk_score(vol, drawdown, var99, val_z)
        cycle = cycle_analysis.detect_equity_cycle(yield_curve, vix, sp500)

        history = self._build_history(prices)

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
            data_status="ok",
            history=history,
            as_of=self._now(),
        )

import pandas as pd
from sqlalchemy.orm import Session

from app.models.schemas import AssetClassMetrics, RiskMetrics
from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, metrics, fundamental_scoring


class Commodities(AssetClassBase):
    asset_class = "hard_assets"
    sub_class = "commodities"

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        prices = fetch_ticker("DBC", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["DBC"])

        cpi = fetch_series("CPIAUCSL", db)
        breakeven = fetch_series("T10YIE", db)
        tbill = fetch_series("DTB3", db)

        risk_free = float(tbill.iloc[-1]) / 100 if not tbill.empty else 0.04
        cpi_yoy = float(cpi.iloc[-1] / cpi.iloc[-12] - 1) * 100 if len(cpi) >= 12 else 2.5

        vol = metrics.realized_volatility(prices)
        sharpe = metrics.sharpe_ratio(prices, risk_free)
        sortino = metrics.sortino_ratio(prices, risk_free)
        drawdown = metrics.max_drawdown(prices)
        var95 = metrics.value_at_risk(prices, 0.95)
        var99 = metrics.value_at_risk(prices, 0.99)
        cvar = metrics.conditional_var(prices, 0.95)

        # Commodities expected return: inflation hedge + supply/demand premium
        real_rate = risk_free - cpi_yoy / 100
        exp_return = fundamental_scoring.gold_expected_return(real_rate, cpi_yoy)  # Same logic
        val_z = fundamental_scoring.valuation_zscore(float(prices.iloc[-1]), prices)
        risk_score = metrics.compute_risk_score(vol, drawdown, var99, val_z)
        cycle = cycle_analysis.detect_inflation_cycle(cpi, breakeven)

        history = self._build_history(prices)

        return AssetClassMetrics(
            asset_class=self.asset_class,
            sub_class=self.sub_class,
            cycle_phase=cycle,
            risk_score=risk_score,
            metrics=RiskMetrics(
                realized_vol=round(vol, 4),
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

import pandas as pd
from sqlalchemy.orm import Session

from app.models.schemas import AssetClassMetrics, RiskMetrics
from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, metrics, fundamental_scoring


class GovernmentBonds(AssetClassBase):
    asset_class = "credit"
    sub_class = "government"

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        prices = fetch_ticker("TLT", db)          # Long-term govt bond ETF
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["TLT"])

        dgs10 = fetch_series("DGS10", db)         # 10Y yield
        yield_curve = fetch_series("T10Y2Y", db)
        hy_spread = fetch_series("BAMLH0A0HYM2", db)
        ig_spread = fetch_series("BAMLC0A0CM", db)
        tbill = fetch_series("DTB3", db)

        risk_free = float(tbill.iloc[-1]) / 100 if not tbill.empty else 0.04
        ytm = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else 0.04

        vol = metrics.realized_volatility(prices)
        sharpe = metrics.sharpe_ratio(prices, risk_free)
        sortino = metrics.sortino_ratio(prices, risk_free)
        drawdown = metrics.max_drawdown(prices)
        var95 = metrics.value_at_risk(prices, 0.95)
        var99 = metrics.value_at_risk(prices, 0.99)
        cvar = metrics.conditional_var(prices, 0.95)

        exp_return = fundamental_scoring.credit_expected_return(
            yield_to_maturity=ytm, spread=0, expected_default_loss=0
        )
        val_z = fundamental_scoring.valuation_zscore(ytm, dgs10)
        risk_score = metrics.compute_risk_score(vol, drawdown, var99, val_z)
        cycle = cycle_analysis.detect_credit_cycle(hy_spread, ig_spread, yield_curve)

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

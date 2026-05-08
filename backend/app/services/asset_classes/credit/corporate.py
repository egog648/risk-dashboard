import pandas as pd
from sqlalchemy.orm import Session

from app.models.schemas import AssetClassMetrics, RiskMetrics
from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, metrics, fundamental_scoring


class CorporateBonds(AssetClassBase):
    """Covers both Investment Grade (LQD) and High Yield (HYG) corporate bonds.

    sub_class is set dynamically: 'corporate_ig' or 'corporate_hy'.
    """

    asset_class = "credit"

    def __init__(self, grade: str = "ig"):
        assert grade in ("ig", "hy"), "grade must be 'ig' or 'hy'"
        self.grade = grade
        self.sub_class = f"corporate_{grade}"

    def get_metrics(self, db: Session) -> AssetClassMetrics:
        ticker = "LQD" if self.grade == "ig" else "HYG"
        spread_series_id = "BAMLC0A0CM" if self.grade == "ig" else "BAMLH0A0HYM2"
        default_loss = 0.003 if self.grade == "ig" else 0.025

        prices = fetch_ticker(ticker, db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=[ticker])

        spread = fetch_series(spread_series_id, db)
        dgs10 = fetch_series("DGS10", db)
        hy_spread = fetch_series("BAMLH0A0HYM2", db)
        ig_spread = fetch_series("BAMLC0A0CM", db)
        yield_curve = fetch_series("T10Y2Y", db)
        tbill = fetch_series("DTB3", db)

        risk_free = float(tbill.iloc[-1]) / 100 if not tbill.empty else 0.04
        ytm = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else 0.04
        current_spread = float(spread.iloc[-1]) if not spread.empty else 100

        vol = metrics.realized_volatility(prices)
        sharpe = metrics.sharpe_ratio(prices, risk_free)
        sortino = metrics.sortino_ratio(prices, risk_free)
        drawdown = metrics.max_drawdown(prices)
        var95 = metrics.value_at_risk(prices, 0.95)
        var99 = metrics.value_at_risk(prices, 0.99)
        cvar = metrics.conditional_var(prices, 0.95)

        exp_return = fundamental_scoring.credit_expected_return(
            yield_to_maturity=ytm,
            spread=current_spread,
            expected_default_loss=default_loss,
        )
        val_z = fundamental_scoring.valuation_zscore(current_spread, spread)
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

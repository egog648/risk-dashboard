from sqlalchemy.orm import Session

from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, fundamental_scoring


class CorporateBonds(AssetClassBase):
    """Covers both Investment Grade (LQD) and High Yield (HYG) corporate bonds."""

    asset_class = "credit"

    def __init__(self, grade: str = "ig"):
        assert grade in ("ig", "hy"), "grade must be 'ig' or 'hy'"
        self.grade = grade
        self.sub_class = f"corporate_{grade}"

    def get_metrics(self, db: Session):
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

        risk_free = self.get_risk_free(tbill)
        ytm = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else 0.04
        current_spread = float(spread.iloc[-1]) if not spread.empty else 100
        exp_return = fundamental_scoring.credit_expected_return(
            yield_to_maturity=ytm,
            spread=current_spread,
            expected_default_loss=default_loss,
        )
        val_z = fundamental_scoring.valuation_zscore(current_spread, spread)

        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_credit_cycle(hy_spread, ig_spread, yield_curve),
            risk_free=risk_free,
            exp_return=exp_return,
            val_z=val_z,
        )

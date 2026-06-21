from sqlalchemy.orm import Session

from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, fundamental_scoring
from app.services.risk.expected_returns import build_asset_class_expected_return


class CorporateBonds(AssetClassBase):
    """Covers both Investment Grade (LQD) and High Yield (HYG) corporate bonds."""

    asset_class = "credit"

    def __init__(self, grade: str = "ig"):
        assert grade in ("ig", "hy"), "grade must be 'ig' or 'hy'"
        self.grade = grade
        self.sub_class = f"corporate_{grade}"

    def get_metrics(self, db: Session, *, include_history: bool = True):
        ticker = "LQD" if self.grade == "ig" else "HYG"
        spread_series_id = "BAMLC0A0CM" if self.grade == "ig" else "BAMLH0A0HYM2"
        weight_key = "credit_corporate_ig" if self.grade == "ig" else "credit_corporate_hy"

        prices = fetch_ticker(ticker, db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=[ticker])

        spread = fetch_series(spread_series_id, db)
        hy_spread = fetch_series("BAMLH0A0HYM2", db)
        ig_spread = fetch_series("BAMLC0A0CM", db)
        yield_curve = fetch_series("T10Y2Y", db)
        tbill = fetch_series("DTB3", db)

        risk_free = self.get_risk_free(tbill)
        current_spread = float(spread.iloc[-1]) if not spread.empty else 100
        exp_return = build_asset_class_expected_return(db, weight_key)
        val_z = fundamental_scoring.valuation_zscore(current_spread, spread)

        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_credit_cycle(hy_spread, ig_spread, yield_curve),
            risk_free=risk_free,
            exp_return=exp_return,
            val_z=val_z,
            include_history=include_history,
        )

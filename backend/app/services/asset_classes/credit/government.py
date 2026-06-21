from sqlalchemy.orm import Session

from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, fundamental_scoring


class GovernmentBonds(AssetClassBase):
    asset_class = "credit"
    sub_class = "government"

    def get_metrics(self, db: Session):
        prices = fetch_ticker("TLT", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["TLT"])

        dgs10 = fetch_series("DGS10", db)
        yield_curve = fetch_series("T10Y2Y", db)
        hy_spread = fetch_series("BAMLH0A0HYM2", db)
        ig_spread = fetch_series("BAMLC0A0CM", db)
        tbill = fetch_series("DTB3", db)

        risk_free = self.get_risk_free(tbill)
        ytm = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else 0.04
        exp_return = fundamental_scoring.credit_expected_return(
            yield_to_maturity=ytm, spread=0, expected_default_loss=0
        )
        val_z = fundamental_scoring.valuation_zscore(ytm, dgs10)

        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_credit_cycle(hy_spread, ig_spread, yield_curve),
            risk_free=risk_free,
            exp_return=exp_return,
            val_z=val_z,
        )

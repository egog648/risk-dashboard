from sqlalchemy.orm import Session

from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, fundamental_scoring


class Gold(AssetClassBase):
    asset_class = "hard_assets"
    sub_class = "gold"

    def get_metrics(self, db: Session):
        prices = fetch_ticker("GLD", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["GLD"])

        cpi = fetch_series("CPIAUCSL", db)
        breakeven = fetch_series("T10YIE", db)
        tbill = fetch_series("DTB3", db)

        risk_free = self.get_risk_free(tbill)
        cpi_yoy = self.get_cpi_yoy(cpi)
        real_rate = risk_free - cpi_yoy / 100
        exp_return = fundamental_scoring.gold_expected_return(real_rate, cpi_yoy)
        val_z = fundamental_scoring.valuation_zscore(float(prices.iloc[-1]), prices)

        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_inflation_cycle(cpi, breakeven),
            risk_free=risk_free,
            exp_return=exp_return,
            val_z=val_z,
        )

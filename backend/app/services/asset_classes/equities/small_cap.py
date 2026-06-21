from sqlalchemy.orm import Session

from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, fundamental_scoring


class SmallCapEquities(AssetClassBase):
    asset_class = "equities"
    sub_class = "small_cap"

    def get_metrics(self, db: Session, *, include_history: bool = True):
        prices = fetch_ticker("IWM", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["IWM"])

        vix = fetch_series("VIXCLS", db)
        yield_curve = fetch_series("T10Y2Y", db)
        sp500 = fetch_series("SP500", db)
        cpi = fetch_series("CPIAUCSL", db)
        tbill = fetch_series("DTB3", db)

        risk_free = self.get_risk_free(tbill)
        cpi_yoy = self.get_cpi_yoy(cpi)
        exp_return = fundamental_scoring.equity_expected_return(
            earnings_yield=0.065, cpi_yoy=cpi_yoy
        )
        val_z = fundamental_scoring.valuation_zscore(float(prices.iloc[-1]), prices)
        implied_vol = round(float(vix.iloc[-1]) / 100, 4) if not vix.empty else None

        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_equity_cycle(yield_curve, vix, sp500),
            risk_free=risk_free,
            exp_return=exp_return,
            val_z=val_z,
            implied_vol=implied_vol,
            include_history=include_history,
        )

from sqlalchemy.orm import Session

from app.services.asset_classes.base import AssetClassBase
from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk import cycle_analysis, fundamental_scoring


class MoneyMarket(AssetClassBase):
    asset_class = "cash"
    sub_class = "money_market"

    def get_metrics(self, db: Session, *, include_history: bool = True):
        prices = fetch_ticker("SHY", db)
        if not self._is_usable_price_series(prices):
            return self._degraded_metrics(missing_series=["SHY"])

        tbill = fetch_series("DTB3", db)
        fed_funds = fetch_series("FEDFUNDS", db)
        cpi = fetch_series("CPIAUCSL", db)

        risk_free = self.get_risk_free(tbill)
        cpi_yoy = self.get_cpi_yoy(cpi)
        real_rate_series = (tbill / 100) - (cpi.pct_change(12) * 100 / 100)
        exp_return = fundamental_scoring.cash_expected_return(risk_free, cpi_yoy)
        val_z = fundamental_scoring.valuation_zscore(risk_free, tbill / 100)

        return self.build_ok_response(
            prices=prices,
            cycle_phase=cycle_analysis.detect_cash_cycle(fed_funds, real_rate_series),
            risk_free=risk_free,
            exp_return=exp_return,
            val_z=val_z,
            include_history=include_history,
        )

"""Abstract base class for all asset class modules.

To add a new sub-asset class:
1. Create a new file in the appropriate sub-folder (e.g., services/asset_classes/equities/micro_cap.py)
2. Subclass AssetClassBase and implement get_metrics()
3. Register it in the corresponding endpoint (e.g., api/v1/endpoints/equities.py)

See docs/modules/09_EXTENDING.md for the full recipe.
"""
from abc import ABC, abstractmethod
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.models.schemas import AssetClassMetrics, RiskMetrics, TimeSeriesPoint


class AssetClassBase(ABC):
    asset_class: str = ""
    sub_class: str = ""

    @abstractmethod
    def get_metrics(self, db: Session) -> AssetClassMetrics:
        """Compute and return risk metrics for this sub-asset class."""
        ...

    def _now(self) -> datetime:
        return datetime.utcnow()

    def _is_usable_price_series(self, prices: pd.Series, min_points: int = 3) -> bool:
        """Require non-empty series with enough non-null observations."""
        if prices.empty:
            return False
        return len(prices.dropna()) >= min_points

    def _build_history(self, prices: pd.Series, points: int = 756) -> list[TimeSeriesPoint]:
        return [
            TimeSeriesPoint(date=d, value=float(v))
            for d, v in prices.dropna().tail(points).items()
        ]

    def _degraded_metrics(
        self,
        *,
        missing_series: list[str],
        cycle_phase: str = "unknown",
    ) -> AssetClassMetrics:
        """Return a consistent degraded response when source data is unavailable."""
        return AssetClassMetrics(
            asset_class=self.asset_class,
            sub_class=self.sub_class,
            cycle_phase=cycle_phase,
            risk_score=100.0,
            metrics=RiskMetrics(),
            data_status="unavailable",
            missing_series=missing_series,
            history=[],
            as_of=self._now(),
        )

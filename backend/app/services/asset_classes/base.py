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
from app.services.risk import metrics
from app.services.risk.expected_returns import get_cpi_yoy, get_risk_free


class AssetClassBase(ABC):
    asset_class: str = ""
    sub_class: str = ""

    @abstractmethod
    def get_metrics(self, db: Session, *, include_history: bool = True) -> AssetClassMetrics:
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

    @staticmethod
    def get_cpi_yoy(cpi: pd.Series) -> float:
        return get_cpi_yoy(cpi)

    @staticmethod
    def get_risk_free(tbill: pd.Series, default: float = 0.04) -> float:
        return get_risk_free(tbill, default)

    def build_standard_risk_stats(
        self,
        prices: pd.Series,
        risk_free: float,
    ) -> dict[str, float]:
        """Compute the standard risk metric block shared by all asset classes."""
        return {
            "vol": metrics.realized_volatility(prices),
            "sharpe": metrics.sharpe_ratio(prices, risk_free),
            "sortino": metrics.sortino_ratio(prices, risk_free),
            "drawdown": metrics.max_drawdown(prices),
            "var95": metrics.value_at_risk(prices, 0.95),
            "var99": metrics.value_at_risk(prices, 0.99),
            "cvar": metrics.conditional_var(prices, 0.95),
        }

    def build_risk_metrics(
        self,
        prices: pd.Series,
        risk_free: float,
        exp_return: float,
        val_z: float,
        *,
        implied_vol: float | None = None,
    ) -> RiskMetrics:
        """Assemble RiskMetrics from standard stats plus class-specific fields."""
        stats = self.build_standard_risk_stats(prices, risk_free)
        return RiskMetrics(
            realized_vol=round(stats["vol"], 4),
            implied_vol=implied_vol,
            sharpe_ratio=round(stats["sharpe"], 3) if not pd.isna(stats["sharpe"]) else None,
            sortino_ratio=round(stats["sortino"], 3) if not pd.isna(stats["sortino"]) else None,
            max_drawdown=round(stats["drawdown"], 4),
            var_95=round(stats["var95"], 4),
            var_99=round(stats["var99"], 4),
            cvar_95=round(stats["cvar"], 4),
            valuation_score=round(val_z, 3),
            expected_return=round(exp_return, 4),
        )

    def build_ok_response(
        self,
        *,
        prices: pd.Series,
        cycle_phase: str,
        risk_free: float,
        exp_return: float,
        val_z: float,
        implied_vol: float | None = None,
        include_history: bool = True,
    ) -> AssetClassMetrics:
        """Build a successful AssetClassMetrics response."""
        stats = self.build_standard_risk_stats(prices, risk_free)
        risk_score = metrics.compute_risk_score(
            stats["vol"], stats["drawdown"], stats["var99"], val_z
        )
        return AssetClassMetrics(
            asset_class=self.asset_class,
            sub_class=self.sub_class,
            cycle_phase=cycle_phase,
            risk_score=risk_score,
            metrics=self.build_risk_metrics(
                prices, risk_free, exp_return, val_z, implied_vol=implied_vol
            ),
            data_status="ok",
            history=self._build_history(prices) if include_history else [],
            as_of=self._now(),
        )

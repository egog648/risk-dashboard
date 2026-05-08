from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


# --- Shared ---

class TimeSeriesPoint(BaseModel):
    date: datetime
    value: float


# --- Asset class metrics ---

class RiskMetrics(BaseModel):
    realized_vol: float | None = None       # Annualized realized volatility
    implied_vol: float | None = None        # Implied vol (VIX proxy or spread vol)
    sharpe_ratio: float | None = None
    sortino_ratio: float | None = None
    max_drawdown: float | None = None
    var_95: float | None = None             # Value at Risk 95%
    var_99: float | None = None             # Value at Risk 99%
    cvar_95: float | None = None            # Conditional VaR / Expected Shortfall
    valuation_score: float | None = None    # z-score vs 20Y history (-3 to +3)
    expected_return: float | None = None    # Fundamental-based forward estimate


CyclePhase = Literal["expansion", "peak", "contraction", "trough", "unknown"]


class AssetClassMetrics(BaseModel):
    asset_class: str
    sub_class: str
    cycle_phase: CyclePhase
    risk_score: float           # 0-100 composite risk score (0=low, 100=high)
    metrics: RiskMetrics
    data_status: Literal["ok", "partial", "unavailable"] = "ok"
    missing_series: list[str] = Field(default_factory=list)
    history: list[TimeSeriesPoint] = Field(default_factory=list)  # Price/return history for charts
    as_of: datetime


# --- Portfolio / Efficient Frontier ---

class PortfolioWeights(BaseModel):
    equities_large: float = 0.20
    equities_mid: float = 0.05
    equities_small: float = 0.05
    credit_government: float = 0.20
    credit_corporate_ig: float = 0.10
    credit_corporate_hy: float = 0.00
    hard_assets_reits: float = 0.10
    hard_assets_gold: float = 0.10
    hard_assets_commodities: float = 0.05
    cash: float = 0.15

    @model_validator(mode="before")
    @classmethod
    def _map_legacy_credit_key(cls, data: Any) -> Any:
        """
        Backward compatibility: map legacy credit_corporate to IG if split keys
        are not provided by the caller.
        """
        if not isinstance(data, dict):
            return data
        if "credit_corporate" not in data:
            return data
        if "credit_corporate_ig" in data or "credit_corporate_hy" in data:
            return data

        mapped = dict(data)
        mapped["credit_corporate_ig"] = mapped.pop("credit_corporate")
        mapped.setdefault("credit_corporate_hy", 0.0)
        return mapped


class FrontierPoint(BaseModel):
    expected_return: float
    volatility: float
    sharpe: float
    weights: dict[str, float]


class EfficientFrontierResponse(BaseModel):
    frontier: list[FrontierPoint]           # Frontier curve points
    max_sharpe: FrontierPoint               # Max Sharpe portfolio
    min_vol: FrontierPoint                  # Min volatility portfolio
    current: FrontierPoint                  # Current allocation
    monte_carlo: list[FrontierPoint]        # 2000 random portfolios
    correlation_matrix: dict[str, dict[str, float]]


# --- Yield curve ---

class YieldCurvePoint(BaseModel):
    tenor: str          # e.g. "3M", "2Y", "10Y", "30Y"
    label: str          # e.g. "3-Month"
    yield_pct: float    # yield in percent (e.g. 4.35)


class YieldCurveResponse(BaseModel):
    points: list[YieldCurvePoint]
    data_status: Literal["ok", "partial", "unavailable"] = "ok"
    missing_series: list[str] = Field(default_factory=list)
    as_of: datetime


# --- Data status ---

class SeriesStatus(BaseModel):
    series_id: str
    source: str
    last_refreshed: datetime | None
    status: str


class DataStatusResponse(BaseModel):
    series: list[SeriesStatus]
    overall_status: Literal["ok", "stale", "error"]
    as_of: datetime

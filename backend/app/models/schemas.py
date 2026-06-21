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


class FrontierComputeRequest(BaseModel):
    weights: PortfolioWeights
    suggested_weights: PortfolioWeights | None = None

    @model_validator(mode="before")
    @classmethod
    def _accept_legacy_flat_weights(cls, data: Any) -> Any:
        """Accept legacy flat PortfolioWeights bodies for backward compatibility."""
        if not isinstance(data, dict):
            return data
        if "weights" in data:
            return data
        if "equities_large" in data or "cash" in data:
            return {"weights": data}
        return data


class EfficientFrontierResponse(BaseModel):
    frontier: list[FrontierPoint]           # Frontier curve points
    max_sharpe: FrontierPoint               # Max Sharpe portfolio
    min_vol: FrontierPoint                  # Min volatility portfolio
    current: FrontierPoint                  # Current allocation
    monte_carlo: list[FrontierPoint]        # 2000 random portfolios
    correlation_matrix: dict[str, dict[str, float]]
    suggested: FrontierPoint | None = None


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


class RefreshRunSummary(BaseModel):
    state: Literal["idle", "running", "completed", "failed"]
    started_at: datetime | None
    completed_at: datetime | None
    duration_ms: float | None
    total_series: int
    ok_count: int
    error_count: int
    failed_series: list[str]


class DataStatusResponse(BaseModel):
    series: list[SeriesStatus]
    overall_status: Literal["ok", "stale", "error"]
    as_of: datetime
    last_refresh_run: RefreshRunSummary | None = None


# --- Custom ticker registry ---

AssetClassKind = Literal["equities", "credit", "hard_assets", "cash"]
ObjectiveKind = Literal["growth", "income", "safety"]


class CustomTickerBase(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=16)
    display_name: str = Field(..., min_length=1, max_length=256)
    asset_class: AssetClassKind
    primary_objective: ObjectiveKind
    growth_pct: float | None = None
    income_pct: float | None = None
    safety_pct: float | None = None
    notes: str | None = None
    risk_proxy_ticker: str | None = None


class CustomTickerCreate(CustomTickerBase):
    pass


class CustomTickerUpdate(BaseModel):
    display_name: str | None = None
    asset_class: AssetClassKind | None = None
    primary_objective: ObjectiveKind | None = None
    growth_pct: float | None = None
    income_pct: float | None = None
    safety_pct: float | None = None
    notes: str | None = None
    risk_proxy_ticker: str | None = None
    is_active: bool | None = None


class CustomTickerResponse(BaseModel):
    id: int
    ticker: str
    display_name: str
    asset_class: AssetClassKind
    primary_objective: ObjectiveKind
    growth_pct: float
    income_pct: float
    safety_pct: float
    notes: str | None
    risk_proxy_ticker: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TickerValidateRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=16)


class TickerValidateResponse(BaseModel):
    ticker: str
    valid: bool
    message: str | None = None


class TickerRecommendation(BaseModel):
    ticker: str
    display_name: str
    asset_class: AssetClassKind
    primary_objective: ObjectiveKind
    match_score: float
    rationale: str


class TickerRecommendResponse(BaseModel):
    recommendations: list[TickerRecommendation]


# --- Client workspace ---

OutlineStatus = Literal["draft", "presented", "implemented"]


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=256)
    notes: str | None = None


class ClientResponse(BaseModel):
    id: int
    name: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    current_profile_id: int | None = None
    portfolio_count: int = 0

    model_config = {"from_attributes": True}


class ClientProfileCreate(BaseModel):
    answers: dict[str, str] = Field(..., description="q1-q12 letter answers")
    growth_pct: float
    income_pct: float
    safety_pct: float
    raw_aggression_pct: float
    governed_aggression_pct: float
    governor_cap_pct: float
    profile_label: str
    risk_label: str
    questions_answered: int = Field(..., ge=0, le=12)


class ClientProfileResponse(BaseModel):
    id: int
    client_id: int
    is_portfolio_override: bool
    answers: dict[str, str]
    growth_pct: float
    income_pct: float
    safety_pct: float
    raw_aggression_pct: float
    governed_aggression_pct: float
    governor_cap_pct: float
    profile_label: str
    risk_label: str
    questions_answered: int
    is_current: bool
    saved_at: datetime

    model_config = {"from_attributes": True}


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    notes: str | None = None


class PortfolioUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=256)
    notes: str | None = None


class PortfolioResponse(BaseModel):
    id: int
    client_id: int
    name: str
    notes: str | None
    profile_override_id: int | None
    effective_profile_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SleeveAllocation(BaseModel):
    stocks: float
    bonds: float
    alts: float
    cash: float


class VehicleSuggestion(BaseModel):
    name: str
    pct: float


class PortfolioOutlineResponse(BaseModel):
    id: int
    portfolio_id: int
    profile_id: int
    sleeve_allocation: SleeveAllocation
    weights: PortfolioWeights
    vehicles: dict[str, list[VehicleSuggestion]]
    narrative: str
    status: OutlineStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PortfolioOutlineStatusUpdate(BaseModel):
    status: OutlineStatus

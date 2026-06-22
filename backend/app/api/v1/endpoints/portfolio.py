from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import ClientProfile
from app.models.schemas import (
    EfficientFrontierResponse,
    FrontierComputeRequest,
    OptimizationConstraintsPayload,
    PortfolioAnalyticsRequest,
    PortfolioAnalyticsResponse,
    PortfolioWeights,
)
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.profiler.constraints import (
    constraints_from_answers,
    constraints_from_governor_cap,
    constraints_from_profile,
    constraints_to_payload,
    payload_to_constraints,
)
from app.services.risk.efficient_frontier import build_frontier, weights_to_frontier_point
from app.services.risk.expected_returns import (
    CANONICAL_WEIGHT_KEYS,
    build_portfolio_expected_returns,
)
from app.services.risk.income_analysis import build_income_yield_by_bucket, compute_income_adequacy
from app.services.risk.stress import run_stress_scenarios

router = APIRouter()

# Mapping: weight key → yfinance ticker
ASSET_TICKERS = {
    "equities_large": "SPY",
    "equities_mid": "MDY",
    "equities_small": "IWM",
    "credit_government": "TLT",
    "credit_corporate_ig": "LQD",
    "credit_corporate_hy": "HYG",
    "hard_assets_gold": "GLD",
    "hard_assets_reits": "VNQ",
    "hard_assets_commodities": "DBC",
    "cash": "SHY",
}


def _normalize_weights(
    weights: PortfolioWeights,
    available: set[str],
) -> dict[str, float]:
    weights_dict = weights.model_dump()
    filtered = {k: v for k, v in weights_dict.items() if k in available}
    total = sum(filtered.values())
    if total > 0:
        filtered = {k: v / total for k, v in filtered.items()}
    return filtered


def _resolve_constraints(
    db: Session,
    body: FrontierComputeRequest,
    profile_id: int | None,
) -> tuple[OptimizationConstraintsPayload | None, object | None]:
    if body.constraints is not None:
        return body.constraints, payload_to_constraints(body.constraints)

    if profile_id is not None:
        profile = db.query(ClientProfile).filter(ClientProfile.id == profile_id).first()
        if profile:
            opt = constraints_from_profile(profile)
            return constraints_to_payload(opt), opt

    return None, None


@router.post("/frontier", response_model=EfficientFrontierResponse)
def compute_frontier(
    body: FrontierComputeRequest,
    db: Session = Depends(get_db),
    high_detail: bool = Query(default=False),
    profile_id: int | None = Query(default=None),
):
    """Compute the efficient frontier and evaluate the provided portfolio weights."""
    n_frontier_points = 50 if high_detail else 25
    n_monte_carlo = 2000 if high_detail else 500
    price_dict = {}
    for key, ticker in ASSET_TICKERS.items():
        series = fetch_ticker(ticker, db)
        if not series.empty:
            price_dict[key] = series

    if len(price_dict) < 3:
        raise HTTPException(status_code=503, detail="Insufficient price data. Run data refresh first.")

    expected_ret = build_portfolio_expected_returns(db)
    if set(body.weights.model_dump().keys()) != CANONICAL_WEIGHT_KEYS:
        raise HTTPException(status_code=500, detail="Portfolio weight schema out of sync with optimizer keys.")

    constraints_payload, opt_constraints = _resolve_constraints(db, body, profile_id)

    try:
        result = build_frontier(
            price_dict,
            expected_ret,
            n_frontier_points=n_frontier_points,
            n_monte_carlo=n_monte_carlo,
            constraints=opt_constraints,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    available = set(price_dict.keys())
    filtered = _normalize_weights(body.weights, available)

    mu = result["mu"]
    cov = result["cov"]
    current_point = weights_to_frontier_point(filtered, mu, cov)

    constraint_warnings = list(result.get("constraint_warnings", []))
    max_vol = constraints_payload.max_portfolio_vol if constraints_payload else None
    if max_vol is not None and current_point.volatility > max_vol + 1e-6:
        constraint_warnings.append(
            f"Current portfolio volatility ({current_point.volatility:.1%}) exceeds governor cap ({max_vol:.1%})."
        )

    suggested_point = None
    if body.suggested_weights is not None:
        suggested_filtered = _normalize_weights(body.suggested_weights, available)
        suggested_point = weights_to_frontier_point(suggested_filtered, mu, cov)
        if max_vol is not None and suggested_point.volatility > max_vol + 1e-6:
            constraint_warnings.append(
                f"Suggested portfolio volatility ({suggested_point.volatility:.1%}) exceeds governor cap ({max_vol:.1%})."
            )

    return EfficientFrontierResponse(
        frontier=result["frontier"],
        max_sharpe=result["max_sharpe"],
        min_vol=result["min_vol"],
        current=current_point,
        monte_carlo=result["monte_carlo"],
        correlation_matrix=result["correlation_matrix"],
        suggested=suggested_point,
        constraints_applied=constraints_payload,
        constraint_warnings=constraint_warnings,
    )


def _resolve_q6_and_constraints(
    db: Session,
    body: PortfolioAnalyticsRequest,
) -> tuple[str | None, OptimizationConstraintsPayload | None]:
    import json

    q6_answer = body.answers.get("q6") if body.answers else None
    constraints_payload: OptimizationConstraintsPayload | None = None

    if body.profile_id is not None:
        profile = db.query(ClientProfile).filter(ClientProfile.id == body.profile_id).first()
        if profile:
            q6_answer = json.loads(profile.answers_json).get("q6", q6_answer)
            constraints_payload = constraints_to_payload(constraints_from_profile(profile))
    elif body.governor_cap_pct is not None:
        constraints_payload = constraints_to_payload(
            constraints_from_governor_cap(body.governor_cap_pct)
        )
    elif body.answers:
        cap = body.governor_cap_pct or 100.0
        constraints_payload = constraints_to_payload(
            constraints_from_answers(body.answers, cap)
        )

    return q6_answer, constraints_payload


@router.post("/analytics", response_model=PortfolioAnalyticsResponse)
def compute_portfolio_analytics(
    body: PortfolioAnalyticsRequest,
    db: Session = Depends(get_db),
):
    """Income adequacy and historical stress scenarios for a portfolio allocation."""
    price_dict = {}
    for key, ticker in ASSET_TICKERS.items():
        series = fetch_ticker(ticker, db)
        if not series.empty:
            price_dict[key] = series

    available = set(price_dict.keys())
    filtered = _normalize_weights(body.weights, available)

    q6_answer, constraints_payload = _resolve_q6_and_constraints(db, body)

    income = None
    income_error = None
    try:
        yields = build_income_yield_by_bucket(db)
        income = compute_income_adequacy(
            filtered,
            yields,
            body.portfolio_value_usd,
            body.annual_income_need_usd,
            body.annual_income_need_pct,
        )
    except Exception as exc:
        income_error = str(exc)
        income = None

    stress = run_stress_scenarios(filtered, price_dict, q6_answer)

    return PortfolioAnalyticsResponse(
        income=income,
        stress=stress,
        constraints_applied=constraints_payload,
    )

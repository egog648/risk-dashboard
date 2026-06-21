from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import EfficientFrontierResponse, PortfolioWeights
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.risk.efficient_frontier import build_frontier, weights_to_frontier_point
from app.services.risk.expected_returns import (
    CANONICAL_WEIGHT_KEYS,
    build_portfolio_expected_returns,
)

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


@router.post("/frontier", response_model=EfficientFrontierResponse)
def compute_frontier(
    weights: PortfolioWeights,
    db: Session = Depends(get_db),
    high_detail: bool = Query(default=False),
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
    if set(weights.model_dump().keys()) != CANONICAL_WEIGHT_KEYS:
        raise HTTPException(status_code=500, detail="Portfolio weight schema out of sync with optimizer keys.")

    try:
        result = build_frontier(
            price_dict,
            expected_ret,
            n_frontier_points=n_frontier_points,
            n_monte_carlo=n_monte_carlo,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    weights_dict = weights.model_dump()
    available = set(price_dict.keys())
    filtered = {k: v for k, v in weights_dict.items() if k in available}
    total = sum(filtered.values())
    if total > 0:
        filtered = {k: v / total for k, v in filtered.items()}

    mu = result["mu"]
    cov = result["cov"]
    current_point = weights_to_frontier_point(filtered, mu, cov)

    return EfficientFrontierResponse(
        frontier=result["frontier"],
        max_sharpe=result["max_sharpe"],
        min_vol=result["min_vol"],
        current=current_point,
        monte_carlo=result["monte_carlo"],
        correlation_matrix=result["correlation_matrix"],
    )

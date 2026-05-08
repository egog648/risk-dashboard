from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import EfficientFrontierResponse, PortfolioWeights
from app.services.data_fetchers.yfinance_client import fetch_ticker
from app.services.data_fetchers.fred_client import fetch_series
from app.services.risk.efficient_frontier import build_frontier, weights_to_frontier_point
from app.services.risk.fundamental_scoring import (
    equity_expected_return,
    credit_expected_return,
    gold_expected_return,
    reit_expected_return,
    cash_expected_return,
)
import pandas as pd

router = APIRouter()

# Mapping: weight key → (yfinance ticker, expected return function key)
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

CANONICAL_WEIGHT_KEYS = set(ASSET_TICKERS.keys())


def _get_expected_returns(db: Session) -> dict[str, float]:
    """Build fundamental-based expected return estimates for all assets."""
    cpi = fetch_series("CPIAUCSL", db)
    tbill = fetch_series("DTB3", db)
    dgs10 = fetch_series("DGS10", db)
    hy_spread = fetch_series("BAMLH0A0HYM2", db)
    ig_spread = fetch_series("BAMLC0A0CM", db)

    cpi_yoy = float(cpi.iloc[-1] / cpi.iloc[-12] - 1) * 100 if len(cpi) >= 12 else 2.5
    risk_free = float(tbill.iloc[-1]) / 100 if not tbill.empty else 0.04
    ytm_10y = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else 0.04
    real_rate = risk_free - cpi_yoy / 100

    expected = {
        "equities_large": equity_expected_return(earnings_yield=0.050, cpi_yoy=cpi_yoy),
        "equities_mid": equity_expected_return(earnings_yield=0.055, cpi_yoy=cpi_yoy),
        "equities_small": equity_expected_return(earnings_yield=0.065, cpi_yoy=cpi_yoy),
        "credit_government": credit_expected_return(ytm_10y, 0, 0),
        "credit_corporate_ig": credit_expected_return(ytm_10y, float(ig_spread.iloc[-1]) if not ig_spread.empty else 100, 0.003),
        "credit_corporate_hy": credit_expected_return(ytm_10y, float(hy_spread.iloc[-1]) if not hy_spread.empty else 400, 0.025),
        "hard_assets_gold": gold_expected_return(real_rate, cpi_yoy),
        "hard_assets_reits": reit_expected_return(0.045, risk_free_rate=risk_free),
        "hard_assets_commodities": gold_expected_return(real_rate, cpi_yoy),
        "cash": cash_expected_return(risk_free, cpi_yoy),
    }
    if set(expected.keys()) != CANONICAL_WEIGHT_KEYS:
        raise RuntimeError("Expected return keys are out of sync with portfolio asset keys.")
    return expected


@router.post("/frontier", response_model=EfficientFrontierResponse)
def compute_frontier(weights: PortfolioWeights, db: Session = Depends(get_db)):
    """Compute the efficient frontier and evaluate the provided portfolio weights."""
    # Load price data for all assets
    price_dict = {}
    for key, ticker in ASSET_TICKERS.items():
        series = fetch_ticker(ticker, db)
        if not series.empty:
            price_dict[key] = series

    if len(price_dict) < 3:
        raise HTTPException(status_code=503, detail="Insufficient price data. Run data refresh first.")

    expected_ret = _get_expected_returns(db)
    if set(weights.model_dump().keys()) != CANONICAL_WEIGHT_KEYS:
        raise HTTPException(status_code=500, detail="Portfolio weight schema out of sync with optimizer keys.")

    try:
        result = build_frontier(price_dict, expected_ret)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Evaluate current allocation
    weights_dict = weights.model_dump()
    # Normalize to only assets with data
    available = set(price_dict.keys())
    filtered = {k: v for k, v in weights_dict.items() if k in available}
    total = sum(filtered.values())
    if total > 0:
        filtered = {k: v / total for k, v in filtered.items()}

    returns_df = pd.DataFrame({k: pd.Series(price_dict[k]) for k in filtered}).pct_change().dropna()
    mu = pd.Series({k: expected_ret.get(k, 0.06) for k in filtered})
    cov = returns_df.ewm(span=252).cov().iloc[-len(filtered):] * 252

    current_point = weights_to_frontier_point(filtered, mu, cov)

    return EfficientFrontierResponse(
        frontier=result["frontier"],
        max_sharpe=result["max_sharpe"],
        min_vol=result["min_vol"],
        current=current_point,
        monte_carlo=result["monte_carlo"],
        correlation_matrix=result["correlation_matrix"],
    )

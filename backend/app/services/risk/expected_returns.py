"""Shared expected return calculations for portfolio optimizer and asset classes."""
from sqlalchemy.orm import Session

from app.services.data_fetchers.fred_client import fetch_series
from app.services.risk.fundamental_scoring import (
    cash_expected_return,
    credit_expected_return,
    equity_expected_return,
    gold_expected_return,
    reit_expected_return,
)

CANONICAL_WEIGHT_KEYS = frozenset({
    "equities_large",
    "equities_mid",
    "equities_small",
    "credit_government",
    "credit_corporate_ig",
    "credit_corporate_hy",
    "hard_assets_gold",
    "hard_assets_reits",
    "hard_assets_commodities",
    "cash",
})


def get_cpi_yoy(cpi) -> float:
    """Year-over-year CPI change in percent."""
    if cpi is None or cpi.empty or len(cpi) < 12:
        return 2.5
    return float(cpi.iloc[-1] / cpi.iloc[-12] - 1) * 100


def get_risk_free(tbill, default: float = 0.04) -> float:
    """Annualized risk-free rate from 3-month T-bill series."""
    if tbill is None or tbill.empty:
        return default
    return float(tbill.iloc[-1]) / 100


def fetch_macro_context(db: Session) -> dict:
    """Load shared macro series used across expected-return calculations."""
    cpi = fetch_series("CPIAUCSL", db)
    tbill = fetch_series("DTB3", db)
    dgs10 = fetch_series("DGS10", db)
    hy_spread = fetch_series("BAMLH0A0HYM2", db)
    ig_spread = fetch_series("BAMLC0A0CM", db)

    cpi_yoy = get_cpi_yoy(cpi)
    risk_free = get_risk_free(tbill)
    ytm_10y = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else 0.04
    real_rate = risk_free - cpi_yoy / 100

    return {
        "cpi": cpi,
        "cpi_yoy": cpi_yoy,
        "risk_free": risk_free,
        "ytm_10y": ytm_10y,
        "real_rate": real_rate,
        "hy_spread": hy_spread,
        "ig_spread": ig_spread,
    }


def build_portfolio_expected_returns(db: Session) -> dict[str, float]:
    """Build fundamental-based expected return estimates for all optimizer assets."""
    ctx = fetch_macro_context(db)
    ig = float(ctx["ig_spread"].iloc[-1]) if not ctx["ig_spread"].empty else 100
    hy = float(ctx["hy_spread"].iloc[-1]) if not ctx["hy_spread"].empty else 400

    expected = {
        "equities_large": equity_expected_return(earnings_yield=0.050, cpi_yoy=ctx["cpi_yoy"]),
        "equities_mid": equity_expected_return(earnings_yield=0.055, cpi_yoy=ctx["cpi_yoy"]),
        "equities_small": equity_expected_return(earnings_yield=0.065, cpi_yoy=ctx["cpi_yoy"]),
        "credit_government": credit_expected_return(ctx["ytm_10y"], 0, 0),
        "credit_corporate_ig": credit_expected_return(ctx["ytm_10y"], ig, 0.003),
        "credit_corporate_hy": credit_expected_return(ctx["ytm_10y"], hy, 0.025),
        "hard_assets_gold": gold_expected_return(ctx["real_rate"], ctx["cpi_yoy"]),
        "hard_assets_reits": reit_expected_return(0.045, risk_free_rate=ctx["risk_free"]),
        "hard_assets_commodities": gold_expected_return(ctx["real_rate"], ctx["cpi_yoy"]),
        "cash": cash_expected_return(ctx["risk_free"], ctx["cpi_yoy"]),
    }
    if set(expected.keys()) != CANONICAL_WEIGHT_KEYS:
        raise RuntimeError("Expected return keys are out of sync with portfolio asset keys.")
    return expected

"""Fundamental valuation scoring.

Produces a z-score of current valuation vs 20-year history for each asset class.
  +3 = extremely expensive (high risk, low expected return)
  0  = historically fair
  -3 = extremely cheap (low risk, high expected return)

Also produces forward-looking expected return estimates based on fundamentals,
NOT purely historical mean returns.
"""
import numpy as np
import pandas as pd

from app.services.risk.return_assumptions import get_assumption


def valuation_zscore(current: float, series: pd.Series, window_years: int = 20) -> float:
    """Z-score of current value vs historical distribution."""
    lookback = min(len(series), window_years * 252)
    hist = series.tail(lookback)
    if hist.std() == 0:
        return 0.0
    z = (current - hist.mean()) / hist.std()
    return float(np.clip(z, -3, 3))


def equity_expected_return(
    sp500: pd.Series | None = None,
    earnings_yield: float | None = None,
    cpi_yoy: float | None = None,
    real_growth: float | None = None,
) -> float:
    """Earnings yield + inflation + real growth = nominal expected return (Gordon Growth Model).

    earnings_yield should be supplied by the return-inputs resolver (Shiller CAPE for large cap).
    """
    if earnings_yield is None:
        earnings_yield = get_assumption("equity_earnings_yield_fallback", use_fallback=True)
    if cpi_yoy is None:
        cpi_yoy = get_assumption("macro_cpi_yoy_fallback", use_fallback=True)
    if real_growth is None:
        real_growth = get_assumption("equity_real_growth")

    return round(earnings_yield + cpi_yoy / 100 + real_growth, 4)


def credit_expected_return(
    yield_to_maturity: float,
    spread: float,
    expected_default_loss: float = 0.005,
) -> float:
    """Expected return for a credit instrument = YTM minus expected default losses."""
    return round(yield_to_maturity + spread / 100 - expected_default_loss, 4)


def gold_expected_return(
    real_rate: float,
    cpi_yoy: float,
    *,
    real_rate_premium_coef: float | None = None,
) -> float:
    """Gold expected return proxy: negative real rates are positive for gold."""
    if real_rate_premium_coef is None:
        real_rate_premium_coef = get_assumption("gold_real_rate_premium_coef")
    real_rate_premium = max(-real_rate, 0) * real_rate_premium_coef
    return round(cpi_yoy / 100 + real_rate_premium, 4)


def reit_expected_return(
    dividend_yield: float,
    cap_rate: float | None = None,
    risk_free_rate: float = 0.04,
    *,
    nav_growth: float | None = None,
    rate_drag_threshold: float | None = None,
    rate_drag_coef: float | None = None,
) -> float:
    """REIT expected return = dividend yield + NAV growth, adjusted for rate environment."""
    if nav_growth is None:
        nav_growth = get_assumption("reit_nav_growth")
    if rate_drag_threshold is None:
        rate_drag_threshold = get_assumption("reit_rate_drag_threshold")
    if rate_drag_coef is None:
        rate_drag_coef = get_assumption("reit_rate_drag_coef")
    rate_drag = max(risk_free_rate - rate_drag_threshold, 0) * rate_drag_coef
    return round(dividend_yield + nav_growth - rate_drag, 4)


def cash_expected_return(
    tbill_yield: float,
    cpi_yoy: float,
) -> float:
    """Cash real return = T-bill yield minus inflation."""
    return round(tbill_yield - cpi_yoy / 100, 4)

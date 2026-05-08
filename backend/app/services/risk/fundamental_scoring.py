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
    cpi_yoy: float = 2.5,
) -> float:
    """Earnings yield + inflation = nominal expected return proxy (Gordon Growth Model).

    earnings_yield: E/P ratio (inverse of P/E). If None, uses 1/CAPE from SP500 trend.
    """
    if earnings_yield is None:
        # Rough proxy: assume 20x P/E → 5% earnings yield
        earnings_yield = 0.05

    # Nominal expected return ≈ earnings yield + long-run earnings growth (≈ GDP ~ inflation + 1.5%)
    real_growth = 0.015
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
) -> float:
    """Gold expected return proxy: negative real rates are positive for gold.

    When real rates are negative, gold tends to outperform.
    """
    # Gold roughly tracks inflation + premium from negative real rates
    real_rate_premium = max(-real_rate, 0) * 0.5
    return round(cpi_yoy / 100 + real_rate_premium, 4)


def reit_expected_return(
    dividend_yield: float,
    cap_rate: float | None = None,
    risk_free_rate: float = 0.04,
) -> float:
    """REIT expected return = dividend yield + NAV growth, adjusted for rate environment."""
    nav_growth = 0.02  # Long-run real NAV growth
    rate_drag = max(risk_free_rate - 0.03, 0) * 0.5  # Rising rates compress multiples
    return round(dividend_yield + nav_growth - rate_drag, 4)


def cash_expected_return(
    tbill_yield: float,
    cpi_yoy: float,
) -> float:
    """Cash real return = T-bill yield minus inflation."""
    return round(tbill_yield - cpi_yoy / 100, 4)

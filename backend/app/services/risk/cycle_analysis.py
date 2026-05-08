"""Business cycle phase detection.

Uses composite indicators to classify the current phase for each asset class:
  - expansion: growth accelerating, conditions improving
  - peak:      growth decelerating from high level
  - contraction: growth falling, conditions tightening
  - trough:    growth bottoming, early recovery signals
"""
import pandas as pd


def detect_equity_cycle(
    yield_curve: pd.Series,   # T10Y2Y
    vix: pd.Series,
    sp500: pd.Series,
) -> str:
    """Classify equity cycle phase from yield curve, VIX, and price trend."""
    if yield_curve.empty or vix.empty or sp500.empty:
        return "unknown"

    yc_latest = yield_curve.iloc[-1]
    vix_latest = vix.iloc[-1]

    # 12-month price momentum
    if len(sp500) >= 252:
        momentum_12m = (sp500.iloc[-1] / sp500.iloc[-252] - 1)
    else:
        momentum_12m = 0.0

    # 3-month price momentum
    if len(sp500) >= 63:
        momentum_3m = (sp500.iloc[-1] / sp500.iloc[-63] - 1)
    else:
        momentum_3m = 0.0

    if yc_latest > 0.5 and momentum_12m > 0.10 and vix_latest < 20:
        return "expansion"
    elif yc_latest > 0 and momentum_12m > 0 and vix_latest > 20:
        return "peak"
    elif yc_latest < 0 and momentum_3m < 0:
        return "contraction"
    elif yc_latest < 0 and momentum_3m > 0:
        return "trough"
    return "expansion" if momentum_12m > 0 else "contraction"


def detect_credit_cycle(
    hy_spread: pd.Series,
    ig_spread: pd.Series,
    yield_curve: pd.Series,
) -> str:
    """Classify credit cycle phase from spread levels and direction."""
    if hy_spread.empty:
        return "unknown"

    hy = hy_spread.iloc[-1]
    # 3-month change in HY spread
    hy_change = (
        hy_spread.iloc[-1] - hy_spread.iloc[-63]
        if len(hy_spread) >= 63
        else 0
    )
    yc = yield_curve.iloc[-1] if not yield_curve.empty else 0

    if hy < 400 and hy_change < 0 and yc > 0:
        return "expansion"
    elif hy < 500 and hy_change > 0:
        return "peak"
    elif hy > 500 and hy_change > 0:
        return "contraction"
    elif hy > 600 and hy_change < 0:
        return "trough"
    return "expansion" if hy_change < 0 else "contraction"


def detect_inflation_cycle(
    cpi: pd.Series,
    breakeven: pd.Series,
) -> str:
    """Classify inflation regime — used for hard asset cycle."""
    if cpi.empty:
        return "unknown"

    # YoY CPI change
    if len(cpi) >= 12:
        cpi_yoy = (cpi.iloc[-1] / cpi.iloc[-12] - 1) * 100
    else:
        cpi_yoy = 0.0

    be = breakeven.iloc[-1] if not breakeven.empty else 2.5

    if cpi_yoy > 4 and be > 3:
        return "peak"       # High and rising — hard assets peak risk regime
    elif cpi_yoy > 2.5 and be > 2.5:
        return "expansion"  # Above-target inflation — favorable for hard assets
    elif cpi_yoy < 2 and be < 2:
        return "contraction"
    else:
        return "trough"


def detect_cash_cycle(
    fed_funds: pd.Series,
    real_rate: pd.Series,
) -> str:
    """Classify cash/rate cycle phase."""
    if fed_funds.empty:
        return "unknown"

    ff = fed_funds.iloc[-1]
    ff_3m_ago = fed_funds.iloc[-63] if len(fed_funds) >= 63 else ff
    hiking = ff > ff_3m_ago

    rr = real_rate.iloc[-1] if not real_rate.empty else 0

    if hiking and rr < 0:
        return "expansion"   # Hiking into negative real rates
    elif hiking and rr > 0:
        return "peak"        # Restrictive territory
    elif not hiking and rr > 0:
        return "contraction" # Holding/cutting from high
    else:
        return "trough"      # Cutting into low/negative real rates

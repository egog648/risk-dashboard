"""Stress beta and portfolio risk helpers for de-risk."""

BLUME_RAW_WEIGHT = 0.67
BLUME_MARKET_WEIGHT = 0.33


def blume_adjusted_beta(raw_beta: float | None, floor: float = 0.35) -> float:
    """Blume adjustment with stress floor."""
    if raw_beta is None:
        return max(1.0, floor)
    adj = BLUME_RAW_WEIGHT * raw_beta + BLUME_MARKET_WEIGHT
    return max(adj, floor)


def portfolio_beta_incl_cash(beta_d_total: float, total: float) -> float:
    if total <= 0:
        return 0.0
    return beta_d_total / total

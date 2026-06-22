import numpy as np
import pandas as pd

from app.services.profiler.constraints import constraints_from_governor_cap
from app.services.risk.efficient_frontier import build_frontier


def _synthetic_prices(n: int = 300, seed: int = 0) -> dict[str, pd.Series]:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2020-01-01", periods=n, freq="B")
    prices: dict[str, pd.Series] = {}
    for key in [
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
    ]:
        rets = rng.normal(0.0003, 0.01, n)
        prices[key] = pd.Series(100 * np.cumprod(1 + rets), index=dates)
    return prices


def test_build_frontier_respects_min_cash():
    prices = _synthetic_prices()
    expected = {k: 0.06 for k in prices}
    constraints = constraints_from_governor_cap(30)

    result = build_frontier(prices, expected, n_frontier_points=5, n_monte_carlo=50, constraints=constraints)

    if result["min_vol"] is not None:
        assert result["min_vol"].weights.get("cash", 0) >= 0.20 - 1e-4


def test_build_frontier_filters_monte_carlo_by_max_vol():
    prices = _synthetic_prices(seed=1)
    expected = {k: 0.06 for k in prices}
    constraints = constraints_from_governor_cap(30)

    result = build_frontier(prices, expected, n_frontier_points=5, n_monte_carlo=100, constraints=constraints)

    max_vol = constraints.max_portfolio_vol
    assert max_vol is not None
    for point in result["monte_carlo"]:
        assert point.volatility <= max_vol + 1e-6

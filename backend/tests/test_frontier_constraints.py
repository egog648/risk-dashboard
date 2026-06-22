import numpy as np
import pandas as pd
import pytest

from app.services.profiler.constraints import constraints_from_governor_cap
from app.services.risk.cycle_analysis import detect_credit_cycle
from app.services.risk.efficient_frontier import build_frontier
from app.services.risk.metrics import compute_returns


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


def test_min_vol_not_greater_than_max_sharpe_under_constraints():
    prices = _synthetic_prices(seed=2)
    expected = {k: 0.05 + 0.01 * i for i, k in enumerate(prices)}
    constraints = constraints_from_governor_cap(60)

    result = build_frontier(prices, expected, n_frontier_points=10, n_monte_carlo=50, constraints=constraints)

    min_vol = result["min_vol"]
    max_sharpe = result["max_sharpe"]
    assert min_vol is not None
    assert max_sharpe is not None
    assert min_vol.volatility <= max_sharpe.volatility + 1e-4


def test_suggested_at_governor_vol_cap():
    prices = _synthetic_prices(seed=3)
    expected = {k: 0.05 + 0.01 * i for i, k in enumerate(prices)}
    constraints = constraints_from_governor_cap(60)

    result = build_frontier(prices, expected, n_frontier_points=10, n_monte_carlo=50, constraints=constraints)

    suggested = result["suggested"]
    min_vol = result["min_vol"]
    max_vol = constraints.max_portfolio_vol
    assert suggested is not None
    assert max_vol is not None
    assert suggested.volatility <= max_vol + 1e-4
    frontier_max_vol = max(p.volatility for p in result["frontier"])
    assert suggested.volatility == pytest.approx(frontier_max_vol, abs=0.01)
    if min_vol is not None:
        assert suggested.expected_return >= min_vol.expected_return - 1e-4


def test_max_sharpe_on_frontier_curve():
    prices = _synthetic_prices(seed=4)
    expected = {k: 0.05 + 0.01 * i for i, k in enumerate(prices)}
    constraints = constraints_from_governor_cap(80)

    result = build_frontier(prices, expected, n_frontier_points=15, n_monte_carlo=50, constraints=constraints)

    max_sharpe = result["max_sharpe"]
    frontier = result["frontier"]
    assert max_sharpe is not None
    assert frontier
    frontier_vols = [p.volatility for p in frontier]
    assert min(frontier_vols) - 1e-3 <= max_sharpe.volatility <= max(frontier_vols) + 1e-3


def test_capped_max_sharpe_returned_when_unconstrained_exceeds_cap():
    prices = _synthetic_prices(seed=5)
    expected = {k: 0.12 if "equities" in k else 0.03 for k in prices}
    constraints = constraints_from_governor_cap(20)

    result = build_frontier(prices, expected, n_frontier_points=8, n_monte_carlo=50, constraints=constraints)

    max_sharpe = result["max_sharpe"]
    max_vol = constraints.max_portfolio_vol
    assert max_sharpe is not None
    assert max_vol is not None
    assert max_sharpe.volatility <= max_vol + 1e-4


def test_ewma_covariance_is_symmetric_psd():
    prices = _synthetic_prices(seed=6)
    df = pd.DataFrame(prices).dropna()
    assets = list(df.columns)
    returns_df = pd.DataFrame({col: compute_returns(df[col]) for col in df.columns}).dropna()
    cov = returns_df.ewm(span=252).cov().iloc[-len(assets):] * 252

    assert cov.shape == (len(assets), len(assets))
    assert np.allclose(cov.values, cov.values.T, atol=1e-10)
    eigvals = np.linalg.eigvalsh(cov.values)
    assert np.all(eigvals >= -1e-8)
    diag_vols = np.sqrt(np.diag(cov.values))
    assert np.all(diag_vols > 0)


def test_build_frontier_with_payload_constraints_from_client():
    """Mirrors frontend body.constraints from constraintsFromProfile (high cap profile)."""
    prices = _synthetic_prices(seed=7)
    expected = {k: 0.05 + 0.01 * i for i, k in enumerate(prices)}
    constraints = constraints_from_governor_cap(100)

    result = build_frontier(prices, expected, n_frontier_points=10, n_monte_carlo=50, constraints=constraints)

    assert len(result["frontier"]) > 0
    assert result["suggested"] is not None


def test_detect_credit_cycle_uses_percent_spreads():
    dates = pd.date_range("2024-01-01", periods=100, freq="B")
    hy = pd.Series(np.linspace(3.2, 3.0, 100), index=dates)
    ig = pd.Series(np.full(100, 1.2), index=dates)
    yc = pd.Series(np.full(100, 0.5), index=dates)

    assert detect_credit_cycle(hy, ig, yc) == "expansion"

    hy_widening = pd.Series(np.linspace(4.5, 5.2, 100), index=dates)
    assert detect_credit_cycle(hy_widening, ig, yc) == "contraction"

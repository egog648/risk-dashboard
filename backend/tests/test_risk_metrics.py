"""Unit tests for risk metric calculations."""
import numpy as np
import pandas as pd
import pytest

from app.services.risk.metrics import (
    compute_returns,
    realized_volatility,
    sharpe_ratio,
    sortino_ratio,
    max_drawdown,
    value_at_risk,
    conditional_var,
    compute_risk_score,
)


@pytest.fixture
def sample_prices():
    """Generate a synthetic price series with known properties."""
    rng = np.random.default_rng(42)
    returns = rng.normal(0.0004, 0.01, 500)  # ~10% annual return, 16% vol
    prices = pd.Series(100 * np.cumprod(1 + returns))
    return prices


def test_realized_vol_positive(sample_prices):
    vol = realized_volatility(sample_prices)
    assert vol > 0
    assert vol < 2  # Should be under 200% annualized


def test_sharpe_ratio(sample_prices):
    sharpe = sharpe_ratio(sample_prices, risk_free_rate=0.04)
    assert isinstance(sharpe, float)


def test_max_drawdown_negative(sample_prices):
    dd = max_drawdown(sample_prices)
    assert dd <= 0


def test_var_negative(sample_prices):
    var = value_at_risk(sample_prices, 0.95)
    assert var < 0


def test_cvar_lte_var(sample_prices):
    var = value_at_risk(sample_prices, 0.95)
    cvar = conditional_var(sample_prices, 0.95)
    assert cvar <= var


def test_risk_score_range():
    score = compute_risk_score(vol=0.20, max_dd=-0.30, var_99=-0.03, valuation_z=1.0)
    assert 0 <= score <= 100


def test_risk_score_high_risk():
    score_high = compute_risk_score(vol=0.50, max_dd=-0.70, var_99=-0.06, valuation_z=3.0)
    score_low = compute_risk_score(vol=0.05, max_dd=-0.05, var_99=-0.005, valuation_z=-2.0)
    assert score_high > score_low

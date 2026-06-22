import numpy as np
import pandas as pd

from app.services.risk.stress import portfolio_drawdown_in_window, q6_tolerance, run_stress_scenarios


def _crash_prices() -> dict[str, pd.Series]:
    dates = pd.date_range("2008-01-01", "2009-06-01", freq="B")
    values = np.linspace(100, 55, len(dates))
    series = pd.Series(values, index=dates)
    return {"equities_large": series, "cash": pd.Series(100.0, index=dates)}


def test_q6_tolerance_mapping():
    assert q6_tolerance("A") == 0.0
    assert q6_tolerance("B") == 0.10
    assert q6_tolerance("D") == 0.25


def test_portfolio_drawdown_in_gfc_window():
    prices = _crash_prices()
    weights = {"equities_large": 1.0, "cash": 0.0}
    dd = portfolio_drawdown_in_window(
        weights,
        prices,
        pd.Timestamp("2008-01-01").date(),
        pd.Timestamp("2009-03-31").date(),
    )
    assert dd is not None
    assert dd < -0.35


def test_stress_scenarios_flags_tolerance():
    prices = _crash_prices()
    weights = {"equities_large": 1.0, "cash": 0.0}
    scenarios = run_stress_scenarios(weights, prices, "B")
    gfc = next(s for s in scenarios if s.id == "gfc_2008")
    assert gfc.exceeds_tolerance is True
    assert gfc.tolerance_pct == 0.10

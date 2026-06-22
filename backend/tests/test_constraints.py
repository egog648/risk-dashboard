from app.services.profiler.constraints import (
    constraints_from_governor_cap,
    max_vol_from_cap,
    min_cash_from_cap,
)


def test_min_cash_from_cap_low():
    assert min_cash_from_cap(30) == 0.20
    assert min_cash_from_cap(20) == 0.20


def test_min_cash_from_cap_medium():
    assert min_cash_from_cap(60) == 0.12
    assert min_cash_from_cap(45) == 0.12


def test_min_cash_from_cap_high():
    assert min_cash_from_cap(100) == 0.05


def test_max_vol_from_cap():
    assert max_vol_from_cap(30) == 0.102
    assert max_vol_from_cap(100) == 0.20


def test_constraints_from_governor_cap():
    c = constraints_from_governor_cap(30)
    assert c.min_cash == 0.20
    assert c.max_portfolio_vol == 0.102
    assert c.weight_bounds is not None
    assert c.weight_bounds["cash"] == (0.20, 0.60)

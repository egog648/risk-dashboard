"""Tests for versioned return assumptions and resolver."""
from datetime import UTC, datetime
from io import BytesIO

import pandas as pd
import pytest

from app.services.data_fetchers import shiller_client, shiller_parser, yfinance_client
from app.services.risk import expected_returns
from app.services.risk.return_assumptions import (
    get_assumption,
    get_assumptions_version,
    load_return_assumptions,
)


def test_registry_loads_with_stable_version():
    registry = load_return_assumptions()
    assert registry.version == "2026-06-21.1"
    assert get_assumptions_version() == "2026-06-21.1"
    assert get_assumption("equity_real_growth") == 0.015
    assert get_assumption("equity_earnings_yield_fallback", use_fallback=True) == 0.05


def test_cape_to_earnings_yield():
    assert shiller_client.cape_to_earnings_yield(25.0) == pytest.approx(0.04, rel=1e-6)


def test_parse_shiller_cape_series_from_fixture():
    import xlwt

    workbook = xlwt.Workbook()
    sheet = workbook.add_sheet("Data")
    sheet.write(0, 0, "Date")
    sheet.write(0, 1, "CAPE")
    sheet.write(1, 0, "2024-01-01")
    sheet.write(1, 1, 30.0)
    sheet.write(2, 0, "2024-02-01")
    sheet.write(2, 1, 32.0)

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    series = shiller_parser.parse_shiller_cape_series(buffer.read())
    assert len(series) == 2
    assert float(series.iloc[-1]) == 32.0


def test_compute_trailing_dividend_yield():
    rows = []
    for day in range(260):
        rows.append(
            {
                "date": f"2025-01-{day % 28 + 1:02d}",
                "adjClose": 100.0,
                "divCash": 0.05 if day % 90 == 0 else 0.0,
            }
        )
    yield_pct = yfinance_client.compute_trailing_dividend_yield(rows, trailing_days=252)
    assert yield_pct == pytest.approx(0.001, rel=1e-3)


def test_shiller_fetch_uses_fallback_when_series_empty(monkeypatch):
    monkeypatch.setattr(shiller_client, "fetch_shiller_cape", lambda _db: pd.Series(dtype=float))
    fallback, as_of = shiller_client.fetch_large_cap_earnings_yield(db=None)
    assert fallback == 0.05
    assert as_of is None


def test_resolve_return_inputs_fallbacks(monkeypatch):
    monkeypatch.setattr(
        expected_returns,
        "fetch_large_cap_earnings_yield",
        lambda _db: (0.05, None),
    )
    monkeypatch.setattr(
        expected_returns,
        "fetch_trailing_dividend_yield",
        lambda _ticker, _db: None,
    )
    monkeypatch.setattr(
        expected_returns,
        "fetch_macro_context",
        lambda _db: expected_returns.MacroContext(
            cpi_yoy=2.5,
            risk_free=0.04,
            ytm_10y=0.04,
            real_rate=0.015,
            ig_spread_bps=100.0,
            hy_spread_bps=400.0,
        ),
    )

    inputs = expected_returns.resolve_return_inputs(db=None)
    assert inputs.equity_earnings_yield_large == 0.05
    assert inputs.equity_earnings_yield_mid == pytest.approx(0.055, rel=1e-6)
    assert inputs.equity_earnings_yield_small == pytest.approx(0.065, rel=1e-6)
    assert inputs.reit_dividend_yield == 0.045
    assert inputs.assumptions_version == "2026-06-21.1"


def test_asset_class_and_optimizer_paths_match(monkeypatch):
    ctx = expected_returns.MacroContext(
        cpi_yoy=2.5,
        risk_free=0.04,
        ytm_10y=0.045,
        real_rate=0.015,
        ig_spread_bps=110.0,
        hy_spread_bps=420.0,
    )
    inputs = expected_returns.ReturnInputs(
        equity_earnings_yield_large=0.048,
        equity_earnings_yield_mid=0.053,
        equity_earnings_yield_small=0.063,
        reit_dividend_yield=0.042,
        equity_real_growth=0.015,
        credit_default_loss_ig=0.003,
        credit_default_loss_hy=0.025,
        reit_nav_growth=0.02,
        reit_rate_drag_threshold=0.03,
        reit_rate_drag_coef=0.5,
        gold_real_rate_premium_coef=0.5,
        assumptions_version="2026-06-21.1",
        live_inputs_as_of=datetime(2026, 6, 1, tzinfo=UTC),
    )

    monkeypatch.setattr(expected_returns, "fetch_macro_context", lambda _db: ctx)
    monkeypatch.setattr(expected_returns, "resolve_return_inputs", lambda _db: inputs)

    portfolio = expected_returns.build_portfolio_expected_returns(db=None)
    for key in expected_returns.CANONICAL_WEIGHT_KEYS:
        single = expected_returns.build_asset_class_expected_return(None, key)
        assert single == portfolio[key]


def test_build_portfolio_expected_returns_keys(monkeypatch):
    monkeypatch.setattr(
        expected_returns,
        "fetch_macro_context",
        lambda _db: expected_returns.MacroContext(
            cpi_yoy=2.5,
            risk_free=0.04,
            ytm_10y=0.04,
            real_rate=0.015,
            ig_spread_bps=100.0,
            hy_spread_bps=400.0,
        ),
    )
    monkeypatch.setattr(
        expected_returns,
        "resolve_return_inputs",
        lambda _db: expected_returns.ReturnInputs(
            equity_earnings_yield_large=0.05,
            equity_earnings_yield_mid=0.055,
            equity_earnings_yield_small=0.065,
            reit_dividend_yield=0.045,
            equity_real_growth=0.015,
            credit_default_loss_ig=0.003,
            credit_default_loss_hy=0.025,
            reit_nav_growth=0.02,
            reit_rate_drag_threshold=0.03,
            reit_rate_drag_coef=0.5,
            gold_real_rate_premium_coef=0.5,
            assumptions_version="2026-06-21.1",
            live_inputs_as_of=None,
        ),
    )

    result = expected_returns.build_portfolio_expected_returns(db=None)
    assert set(result.keys()) == expected_returns.CANONICAL_WEIGHT_KEYS
    assert all(isinstance(value, float) for value in result.values())

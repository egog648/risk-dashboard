"""Shared expected return calculations for portfolio optimizer and asset classes."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.services.data_fetchers.fred_client import fetch_series
from app.services.data_fetchers.shiller_client import fetch_large_cap_earnings_yield
from app.services.data_fetchers.yfinance_client import fetch_trailing_dividend_yield
from app.services.risk.fundamental_scoring import (
    cash_expected_return,
    credit_expected_return,
    equity_expected_return,
    gold_expected_return,
    reit_expected_return,
)
from app.services.risk.return_assumptions import get_assumption, get_assumptions_version

CANONICAL_WEIGHT_KEYS = frozenset({
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
})


@dataclass(frozen=True)
class MacroContext:
    cpi_yoy: float
    risk_free: float
    ytm_10y: float
    real_rate: float
    ig_spread_bps: float
    hy_spread_bps: float


@dataclass(frozen=True)
class ReturnInputs:
    equity_earnings_yield_large: float
    equity_earnings_yield_mid: float
    equity_earnings_yield_small: float
    reit_dividend_yield: float
    equity_real_growth: float
    credit_default_loss_ig: float
    credit_default_loss_hy: float
    reit_nav_growth: float
    reit_rate_drag_threshold: float
    reit_rate_drag_coef: float
    gold_real_rate_premium_coef: float
    assumptions_version: str
    live_inputs_as_of: datetime | None


def get_cpi_yoy(cpi: pd.Series) -> float:
    """Year-over-year CPI change in percent."""
    fallback = get_assumption("macro_cpi_yoy_fallback", use_fallback=True)
    if cpi is None or cpi.empty or len(cpi) < 12:
        return fallback
    return float(cpi.iloc[-1] / cpi.iloc[-12] - 1) * 100


def get_risk_free(tbill: pd.Series, default: float | None = None) -> float:
    """Annualized risk-free rate from 3-month T-bill series."""
    if default is None:
        default = get_assumption("macro_risk_free_fallback", use_fallback=True)
    if tbill is None or tbill.empty:
        return default
    return float(tbill.iloc[-1]) / 100


def fetch_macro_context(db: Session) -> MacroContext:
    """Load shared macro series used across expected-return calculations."""
    cpi = fetch_series("CPIAUCSL", db)
    tbill = fetch_series("DTB3", db)
    dgs10 = fetch_series("DGS10", db)
    hy_spread = fetch_series("BAMLH0A0HYM2", db)
    ig_spread = fetch_series("BAMLC0A0CM", db)

    cpi_yoy = get_cpi_yoy(cpi)
    risk_free = get_risk_free(tbill)
    ytm_fallback = get_assumption("macro_ytm_10y_fallback", use_fallback=True)
    ytm_10y = float(dgs10.iloc[-1]) / 100 if not dgs10.empty else ytm_fallback
    real_rate = risk_free - cpi_yoy / 100

    ig_fallback = get_assumption("macro_ig_spread_fallback_bps", use_fallback=True)
    hy_fallback = get_assumption("macro_hy_spread_fallback_bps", use_fallback=True)
    ig_spread_bps = float(ig_spread.iloc[-1]) if not ig_spread.empty else ig_fallback
    hy_spread_bps = float(hy_spread.iloc[-1]) if not hy_spread.empty else hy_fallback

    return MacroContext(
        cpi_yoy=cpi_yoy,
        risk_free=risk_free,
        ytm_10y=ytm_10y,
        real_rate=real_rate,
        ig_spread_bps=ig_spread_bps,
        hy_spread_bps=hy_spread_bps,
    )


def resolve_return_inputs(db: Session) -> ReturnInputs:
    """Resolve live and registry-sourced inputs for expected-return models."""
    large_yield, shiller_as_of = fetch_large_cap_earnings_yield(db)
    mid_premium = get_assumption("equity_size_premium_mid")
    small_premium = get_assumption("equity_size_premium_small")

    reit_yield = fetch_trailing_dividend_yield("VNQ", db)
    if reit_yield is None:
        reit_yield = get_assumption("reit_dividend_yield_fallback", use_fallback=True)

    live_as_of = shiller_as_of

    return ReturnInputs(
        equity_earnings_yield_large=large_yield,
        equity_earnings_yield_mid=round(large_yield + mid_premium, 6),
        equity_earnings_yield_small=round(large_yield + small_premium, 6),
        reit_dividend_yield=reit_yield,
        equity_real_growth=get_assumption("equity_real_growth"),
        credit_default_loss_ig=get_assumption("credit_default_loss_ig"),
        credit_default_loss_hy=get_assumption("credit_default_loss_hy"),
        reit_nav_growth=get_assumption("reit_nav_growth"),
        reit_rate_drag_threshold=get_assumption("reit_rate_drag_threshold"),
        reit_rate_drag_coef=get_assumption("reit_rate_drag_coef"),
        gold_real_rate_premium_coef=get_assumption("gold_real_rate_premium_coef"),
        assumptions_version=get_assumptions_version(),
        live_inputs_as_of=live_as_of,
    )


def compute_expected_return(key: str, ctx: MacroContext, inputs: ReturnInputs) -> float:
    """Compute fundamental expected return for a canonical portfolio weight key."""
    if key == "equities_large":
        return equity_expected_return(
            earnings_yield=inputs.equity_earnings_yield_large,
            cpi_yoy=ctx.cpi_yoy,
            real_growth=inputs.equity_real_growth,
        )
    if key == "equities_mid":
        return equity_expected_return(
            earnings_yield=inputs.equity_earnings_yield_mid,
            cpi_yoy=ctx.cpi_yoy,
            real_growth=inputs.equity_real_growth,
        )
    if key == "equities_small":
        return equity_expected_return(
            earnings_yield=inputs.equity_earnings_yield_small,
            cpi_yoy=ctx.cpi_yoy,
            real_growth=inputs.equity_real_growth,
        )
    if key == "credit_government":
        return credit_expected_return(ctx.ytm_10y, 0, 0)
    if key == "credit_corporate_ig":
        return credit_expected_return(
            ctx.ytm_10y,
            ctx.ig_spread_bps,
            inputs.credit_default_loss_ig,
        )
    if key == "credit_corporate_hy":
        return credit_expected_return(
            ctx.ytm_10y,
            ctx.hy_spread_bps,
            inputs.credit_default_loss_hy,
        )
    if key == "hard_assets_gold":
        return gold_expected_return(
            ctx.real_rate,
            ctx.cpi_yoy,
            real_rate_premium_coef=inputs.gold_real_rate_premium_coef,
        )
    if key == "hard_assets_reits":
        return reit_expected_return(
            inputs.reit_dividend_yield,
            risk_free_rate=ctx.risk_free,
            nav_growth=inputs.reit_nav_growth,
            rate_drag_threshold=inputs.reit_rate_drag_threshold,
            rate_drag_coef=inputs.reit_rate_drag_coef,
        )
    if key == "hard_assets_commodities":
        return gold_expected_return(
            ctx.real_rate,
            ctx.cpi_yoy,
            real_rate_premium_coef=inputs.gold_real_rate_premium_coef,
        )
    if key == "cash":
        return cash_expected_return(ctx.risk_free, ctx.cpi_yoy)

    raise KeyError(f"Unknown expected return key: {key}")


def build_portfolio_expected_returns(db: Session) -> dict[str, float]:
    """Build fundamental-based expected return estimates for all optimizer assets."""
    ctx = fetch_macro_context(db)
    inputs = resolve_return_inputs(db)
    expected = {key: compute_expected_return(key, ctx, inputs) for key in CANONICAL_WEIGHT_KEYS}
    if set(expected.keys()) != CANONICAL_WEIGHT_KEYS:
        raise RuntimeError("Expected return keys are out of sync with portfolio asset keys.")
    return expected


def build_asset_class_expected_return(db: Session, key: str) -> float:
    """Compute expected return for a single asset class using the shared resolver."""
    if key not in CANONICAL_WEIGHT_KEYS:
        raise KeyError(f"Unknown asset class weight key: {key}")
    ctx = fetch_macro_context(db)
    inputs = resolve_return_inputs(db)
    return compute_expected_return(key, ctx, inputs)

"""Efficient frontier optimizer.

Uses PyPortfolioOpt for the main optimizer and scipy for the full frontier curve.
Expected returns are fundamental-based (not purely historical means).
Covariance is EWMA-weighted.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier
from pypfopt.exceptions import OptimizationError

from app.models.schemas import FrontierPoint
from app.services.profiler.constraints import OptimizationConstraints
from app.services.risk.metrics import compute_returns

DEFAULT_WEIGHT_BOUNDS = (0.0, 0.60)


def _resolve_weight_bounds(
    assets: list[str],
    default_bounds: tuple[float, float],
    constraints: OptimizationConstraints | None,
) -> list[tuple[float, float]]:
    overrides = constraints.weight_bounds if constraints and constraints.weight_bounds else {}
    resolved: list[tuple[float, float]] = []
    for asset in assets:
        if asset in overrides:
            lower, upper = overrides[asset]
            resolved.append((lower, min(upper, default_bounds[1])))
        else:
            resolved.append(default_bounds)
    return resolved


def _point_exceeds_vol(point: FrontierPoint | None, max_vol: float | None) -> bool:
    if point is None or max_vol is None:
        return False
    return point.volatility > max_vol + 1e-6


def _filter_by_max_vol(
    points: list[FrontierPoint],
    max_vol: float | None,
) -> list[FrontierPoint]:
    if max_vol is None:
        return points
    return [p for p in points if p.volatility <= max_vol + 1e-6]


def build_frontier(
    price_dict: dict[str, pd.Series],
    expected_ret: dict[str, float],
    n_frontier_points: int = 25,
    n_monte_carlo: int = 500,
    weight_bounds: tuple[float, float] = DEFAULT_WEIGHT_BOUNDS,
    constraints: OptimizationConstraints | None = None,
) -> dict:
    """Compute the efficient frontier."""
    df = pd.DataFrame(price_dict).dropna()
    if df.shape[0] < 60:
        raise ValueError("Not enough overlapping price history to compute frontier")

    assets = list(df.columns)
    bounds_list = _resolve_weight_bounds(assets, weight_bounds, constraints)
    max_vol = constraints.max_portfolio_vol if constraints else None
    constraint_warnings: list[str] = []

    returns_df = pd.DataFrame({col: compute_returns(df[col]) for col in df.columns}).dropna()
    cov_matrix = returns_df.ewm(span=252).cov().iloc[-len(assets):] * 252
    mu = pd.Series({k: expected_ret.get(k, 0.06) for k in assets})

    max_sharpe = None
    ef_sharpe = EfficientFrontier(mu, cov_matrix, weight_bounds=bounds_list)
    try:
        ef_sharpe.max_sharpe()
        ms_perf = ef_sharpe.portfolio_performance()
        max_sharpe = FrontierPoint(
            expected_return=round(ms_perf[0], 4),
            volatility=round(ms_perf[1], 4),
            sharpe=round(ms_perf[2], 4),
            weights=dict(ef_sharpe.clean_weights()),
        )
        if _point_exceeds_vol(max_sharpe, max_vol):
            constraint_warnings.append(
                "Max Sharpe portfolio exceeds governor volatility cap; capped alternative not shown."
            )
            max_sharpe = None
    except OptimizationError:
        constraint_warnings.append("Max Sharpe optimization infeasible under governor constraints.")

    min_vol = None
    ef_minvol = EfficientFrontier(mu, cov_matrix, weight_bounds=bounds_list)
    try:
        if max_vol is not None:
            ef_minvol.efficient_risk(target_volatility=max_vol)
        else:
            ef_minvol.min_volatility()
        mv_perf = ef_minvol.portfolio_performance()
        min_vol = FrontierPoint(
            expected_return=round(mv_perf[0], 4),
            volatility=round(mv_perf[1], 4),
            sharpe=round(mv_perf[2], 4),
            weights=dict(ef_minvol.clean_weights()),
        )
    except OptimizationError:
        try:
            ef_minvol = EfficientFrontier(mu, cov_matrix, weight_bounds=bounds_list)
            ef_minvol.min_volatility()
            mv_perf = ef_minvol.portfolio_performance()
            min_vol = FrontierPoint(
                expected_return=round(mv_perf[0], 4),
                volatility=round(mv_perf[1], 4),
                sharpe=round(mv_perf[2], 4),
                weights=dict(ef_minvol.clean_weights()),
            )
            if _point_exceeds_vol(min_vol, max_vol):
                constraint_warnings.append(
                    "Minimum-volatility portfolio exceeds governor volatility cap."
                )
                min_vol = None
        except OptimizationError:
            constraint_warnings.append("Min volatility optimization infeasible under governor constraints.")

    frontier_points = _compute_frontier_curve(
        mu, cov_matrix, bounds_list, n_frontier_points, max_vol=max_vol
    )
    mc_points = _monte_carlo_portfolios(
        mu.values, cov_matrix.values, assets, n_monte_carlo, max_vol=max_vol
    )

    corr = returns_df.corr().round(3)
    corr_dict = {col: corr[col].to_dict() for col in corr.columns}

    return {
        "frontier": frontier_points,
        "max_sharpe": max_sharpe,
        "min_vol": min_vol,
        "monte_carlo": mc_points,
        "correlation_matrix": corr_dict,
        "mu": mu,
        "cov": cov_matrix,
        "constraint_warnings": constraint_warnings,
    }


def _compute_frontier_curve(
    mu: pd.Series,
    cov: pd.DataFrame,
    weight_bounds: list[tuple[float, float]],
    n_points: int,
    max_vol: float | None = None,
) -> list[FrontierPoint]:
    """Trace the efficient frontier by targeting returns or volatility."""
    points: list[FrontierPoint] = []

    if max_vol is not None:
        vol_targets = np.linspace(max_vol * 0.5, max_vol, n_points)
        for target_vol in vol_targets:
            try:
                ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
                ef.efficient_risk(target_volatility=float(target_vol))
                perf = ef.portfolio_performance()
                points.append(
                    FrontierPoint(
                        expected_return=round(perf[0], 4),
                        volatility=round(perf[1], 4),
                        sharpe=round(perf[2], 4),
                        weights=dict(ef.clean_weights()),
                    )
                )
            except (OptimizationError, ValueError):
                continue
        return points

    min_ret = float(mu.min()) * 1.05
    max_ret = float(mu.max()) * 0.95
    target_returns = np.linspace(min_ret, max_ret, n_points)

    for target in target_returns:
        try:
            ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
            ef.efficient_return(target_return=target)
            perf = ef.portfolio_performance()
            points.append(
                FrontierPoint(
                    expected_return=round(perf[0], 4),
                    volatility=round(perf[1], 4),
                    sharpe=round(perf[2], 4),
                    weights=dict(ef.clean_weights()),
                )
            )
        except (OptimizationError, ValueError):
            continue

    return _filter_by_max_vol(points, max_vol)


def _monte_carlo_portfolios(
    mu: np.ndarray,
    cov: np.ndarray,
    assets: list[str],
    n: int,
    max_vol: float | None = None,
) -> list[FrontierPoint]:
    """Generate n random long-only portfolios."""
    points: list[FrontierPoint] = []
    rng = np.random.default_rng(42)

    for _ in range(n):
        w = rng.dirichlet(np.ones(len(assets)))
        ret = float(w @ mu)
        vol = float(np.sqrt(w @ cov @ w))
        if max_vol is not None and vol > max_vol + 1e-6:
            continue
        sharpe = (ret - 0.04) / vol if vol > 0 else 0
        points.append(
            FrontierPoint(
                expected_return=round(ret, 4),
                volatility=round(vol, 4),
                sharpe=round(sharpe, 4),
                weights={a: round(float(v), 4) for a, v in zip(assets, w)},
            )
        )

    return points


def weights_to_frontier_point(
    weights: dict[str, float],
    mu: pd.Series,
    cov: pd.DataFrame,
    risk_free: float = 0.04,
) -> FrontierPoint:
    """Evaluate a specific weight vector on the frontier."""
    w = np.array([weights.get(a, 0) for a in mu.index])
    ret = float(w @ mu.values)
    vol = float(np.sqrt(w @ cov.values @ w))
    sharpe = (ret - risk_free) / vol if vol > 0 else 0
    return FrontierPoint(
        expected_return=round(ret, 4),
        volatility=round(vol, 4),
        sharpe=round(sharpe, 4),
        weights=weights,
    )

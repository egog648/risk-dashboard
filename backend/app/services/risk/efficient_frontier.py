"""Efficient frontier optimizer.

Uses PyPortfolioOpt for the main optimizer and scipy for the full frontier curve.
Expected returns are fundamental-based (not purely historical means).
Covariance is EWMA-weighted.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from cvxpy.error import SolverError
from pypfopt import EfficientFrontier
from pypfopt.exceptions import OptimizationError

from app.models.schemas import FrontierPoint
from app.services.profiler.constraints import OptimizationConstraints
from app.services.risk.metrics import compute_returns

DEFAULT_WEIGHT_BOUNDS = (0.0, 0.60)
DEFAULT_RISK_FREE = 0.04
_OPTIMIZER_ERRORS = (OptimizationError, ValueError, SolverError)


def _normalize_ewma_covariance(stacked: pd.DataFrame) -> pd.DataFrame:
    """Collapse pandas EWMA stacked covariance to a plain asset x asset matrix."""
    if isinstance(stacked.index, pd.MultiIndex):
        row_labels = [str(idx[-1]) for idx in stacked.index]
    else:
        row_labels = [str(idx) for idx in stacked.index]

    if isinstance(stacked.columns, pd.MultiIndex):
        col_labels = [str(col[-1]) for col in stacked.columns]
    else:
        col_labels = [str(col) for col in stacked.columns]

    return pd.DataFrame(stacked.values, index=row_labels, columns=col_labels)


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


def _frontier_point_from_ef(
    ef: EfficientFrontier,
    risk_free: float,
) -> FrontierPoint:
    perf = ef.portfolio_performance(risk_free_rate=risk_free)
    return FrontierPoint(
        expected_return=round(perf[0], 4),
        volatility=round(perf[1], 4),
        sharpe=round(perf[2], 4),
        weights=dict(ef.clean_weights()),
    )


def _optimize_at_target_vol(
    mu: pd.Series,
    cov: pd.DataFrame,
    weight_bounds: list[tuple[float, float]],
    target_vol: float,
    risk_free: float,
) -> FrontierPoint | None:
    try:
        ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
        ef.efficient_risk(target_volatility=float(target_vol))
        return _frontier_point_from_ef(ef, risk_free)
    except _OPTIMIZER_ERRORS:
        return None


def _optimize_min_volatility(
    mu: pd.Series,
    cov: pd.DataFrame,
    weight_bounds: list[tuple[float, float]],
    risk_free: float,
) -> FrontierPoint | None:
    try:
        ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
        ef.min_volatility()
        return _frontier_point_from_ef(ef, risk_free)
    except _OPTIMIZER_ERRORS:
        return None


def _merge_frontier_points(
    points: list[FrontierPoint],
    *extra: FrontierPoint | None,
) -> list[FrontierPoint]:
    """Sort frontier by volatility and dedupe near-identical vol levels."""
    merged = list(points)
    for point in extra:
        if point is not None:
            merged.append(point)
    merged.sort(key=lambda p: p.volatility)
    deduped: list[FrontierPoint] = []
    for point in merged:
        if deduped and abs(point.volatility - deduped[-1].volatility) < 1e-4:
            if point.expected_return > deduped[-1].expected_return:
                deduped[-1] = point
        else:
            deduped.append(point)
    return deduped


def build_frontier(
    price_dict: dict[str, pd.Series],
    expected_ret: dict[str, float],
    n_frontier_points: int = 25,
    n_monte_carlo: int = 500,
    weight_bounds: tuple[float, float] = DEFAULT_WEIGHT_BOUNDS,
    constraints: OptimizationConstraints | None = None,
    risk_free: float = DEFAULT_RISK_FREE,
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
    stacked_cov = returns_df.ewm(span=252).cov().iloc[-len(assets):] * 252
    cov_matrix = _normalize_ewma_covariance(stacked_cov)
    mu = pd.Series({k: expected_ret.get(k, 0.06) for k in assets})

    min_vol = _optimize_min_volatility(mu, cov_matrix, bounds_list, risk_free)
    if _point_exceeds_vol(min_vol, max_vol):
        constraint_warnings.append(
            "Minimum-volatility portfolio exceeds governor volatility cap."
        )
        min_vol = None
    elif min_vol is None:
        constraint_warnings.append("Min volatility optimization infeasible under governor constraints.")

    max_sharpe = None
    try:
        ef_sharpe = EfficientFrontier(mu, cov_matrix, weight_bounds=bounds_list)
        ef_sharpe.max_sharpe(risk_free_rate=risk_free)
        max_sharpe = _frontier_point_from_ef(ef_sharpe, risk_free)
        if _point_exceeds_vol(max_sharpe, max_vol):
            capped = (
                _optimize_at_target_vol(mu, cov_matrix, bounds_list, max_vol, risk_free)
                if max_vol is not None
                else None
            )
            if capped is not None:
                constraint_warnings.append(
                    "Max Sharpe portfolio exceeds governor volatility cap; showing capped alternative."
                )
                max_sharpe = capped
            else:
                constraint_warnings.append(
                    "Max Sharpe portfolio exceeds governor volatility cap; capped alternative not shown."
                )
                max_sharpe = None
    except _OPTIMIZER_ERRORS:
        constraint_warnings.append("Max Sharpe optimization infeasible under governor constraints.")

    suggested = None
    if max_vol is not None:
        suggested = _optimize_at_target_vol(mu, cov_matrix, bounds_list, max_vol, risk_free)
        if suggested is None:
            constraint_warnings.append(
                "Suggested portfolio at governor vol cap could not be optimized."
            )

    min_vol_for_curve = min_vol.volatility if min_vol is not None else None
    frontier_points = _compute_frontier_curve(
        mu,
        cov_matrix,
        bounds_list,
        n_frontier_points,
        max_vol=max_vol,
        min_vol=min_vol_for_curve,
        risk_free=risk_free,
    )
    frontier_points = _merge_frontier_points(frontier_points, min_vol, max_sharpe, suggested)

    mc_points = _monte_carlo_portfolios(
        mu.values,
        cov_matrix.values,
        assets,
        n_monte_carlo,
        max_vol=max_vol,
        risk_free=risk_free,
    )

    ewma_corr = _ewma_correlation_matrix(cov_matrix)
    corr_dict = {
        str(col): {str(row): float(ewma_corr.loc[row, col]) for row in ewma_corr.index}
        for col in ewma_corr.columns
    }

    return {
        "frontier": frontier_points,
        "max_sharpe": max_sharpe,
        "min_vol": min_vol,
        "suggested": suggested,
        "monte_carlo": mc_points,
        "correlation_matrix": corr_dict,
        "mu": mu,
        "cov": cov_matrix,
        "constraint_warnings": constraint_warnings,
    }


def _ewma_correlation_matrix(cov: pd.DataFrame) -> pd.DataFrame:
    """Derive correlation matrix from the EWMA covariance used in optimization."""
    std = np.sqrt(np.diag(cov.values))
    with np.errstate(divide="ignore", invalid="ignore"):
        corr = cov.values / np.outer(std, std)
    corr = np.nan_to_num(corr, nan=0.0)
    np.fill_diagonal(corr, 1.0)
    return pd.DataFrame(corr, index=cov.index, columns=cov.columns).round(3)


def _compute_frontier_curve(
    mu: pd.Series,
    cov: pd.DataFrame,
    weight_bounds: list[tuple[float, float]],
    n_points: int,
    max_vol: float | None = None,
    min_vol: float | None = None,
    risk_free: float = DEFAULT_RISK_FREE,
) -> list[FrontierPoint]:
    """Trace the efficient frontier by targeting returns or volatility."""
    points: list[FrontierPoint] = []

    if max_vol is not None:
        vol_floor = min_vol if min_vol is not None and min_vol < max_vol else max_vol * 0.1
        vol_floor = max(vol_floor, 1e-4)
        vol_targets = np.linspace(vol_floor, max_vol, n_points)
        for target_vol in vol_targets:
            point = _optimize_at_target_vol(mu, cov, weight_bounds, float(target_vol), risk_free)
            if point is not None:
                points.append(point)
        return points

    min_ret = float(mu.min()) * 1.05
    max_ret = float(mu.max()) * 0.95
    target_returns = np.linspace(min_ret, max_ret, n_points)

    for target in target_returns:
        try:
            ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
            ef.efficient_return(target_return=target)
            points.append(_frontier_point_from_ef(ef, risk_free))
        except _OPTIMIZER_ERRORS:
            continue

    return _filter_by_max_vol(points, max_vol)


def _monte_carlo_portfolios(
    mu: np.ndarray,
    cov: np.ndarray,
    assets: list[str],
    n: int,
    max_vol: float | None = None,
    risk_free: float = DEFAULT_RISK_FREE,
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
        sharpe = (ret - risk_free) / vol if vol > 0 else 0
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
    risk_free: float = DEFAULT_RISK_FREE,
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

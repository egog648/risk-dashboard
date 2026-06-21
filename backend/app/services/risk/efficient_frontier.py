"""Efficient frontier optimizer.

Uses PyPortfolioOpt for the main optimizer and scipy for the full frontier curve.
Expected returns are fundamental-based (not purely historical means).
Covariance is EWMA-weighted.
"""
import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier
from pypfopt.exceptions import OptimizationError

from app.models.schemas import FrontierPoint
from app.services.risk.metrics import compute_returns


def build_frontier(
    price_dict: dict[str, pd.Series],
    expected_ret: dict[str, float],
    n_frontier_points: int = 50,
    n_monte_carlo: int = 2000,
    weight_bounds: tuple[float, float] = (0.0, 0.60),
) -> dict:
    """Compute the efficient frontier.

    Args:
        price_dict: {asset_key: price_series}
        expected_ret: {asset_key: annualized_expected_return}
        n_frontier_points: number of points on the frontier curve
        n_monte_carlo: number of random portfolios for scatter
        weight_bounds: (min, max) weight per asset

    Returns:
        dict with keys: frontier, max_sharpe, min_vol, monte_carlo, correlation_matrix, mu, cov
    """
    # Align series to common dates
    df = pd.DataFrame(price_dict).dropna()
    if df.shape[0] < 60:
        raise ValueError("Not enough overlapping price history to compute frontier")

    assets = list(df.columns)

    # EWMA covariance (annualized) using log returns
    returns_df = pd.DataFrame({col: compute_returns(df[col]) for col in df.columns}).dropna()
    cov_matrix = returns_df.ewm(span=252).cov().iloc[-len(assets):] * 252

    mu = pd.Series({k: expected_ret.get(k, 0.06) for k in assets})

    # --- Max Sharpe ---
    ef_sharpe = EfficientFrontier(mu, cov_matrix, weight_bounds=weight_bounds)
    try:
        ef_sharpe.max_sharpe()
        max_sharpe_weights = ef_sharpe.clean_weights()
        ms_perf = ef_sharpe.portfolio_performance()
        max_sharpe = FrontierPoint(
            expected_return=round(ms_perf[0], 4),
            volatility=round(ms_perf[1], 4),
            sharpe=round(ms_perf[2], 4),
            weights=dict(max_sharpe_weights),
        )
    except OptimizationError:
        max_sharpe = None

    # --- Min Volatility ---
    ef_minvol = EfficientFrontier(mu, cov_matrix, weight_bounds=weight_bounds)
    try:
        ef_minvol.min_volatility()
        min_vol_weights = ef_minvol.clean_weights()
        mv_perf = ef_minvol.portfolio_performance()
        min_vol = FrontierPoint(
            expected_return=round(mv_perf[0], 4),
            volatility=round(mv_perf[1], 4),
            sharpe=round(mv_perf[2], 4),
            weights=dict(min_vol_weights),
        )
    except OptimizationError:
        min_vol = None

    # --- Frontier curve ---
    frontier_points = _compute_frontier_curve(
        mu, cov_matrix, weight_bounds, n_frontier_points
    )

    # --- Monte Carlo scatter ---
    mc_points = _monte_carlo_portfolios(mu.values, cov_matrix.values, assets, n_monte_carlo)

    # --- Correlation matrix ---
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
    }


def _compute_frontier_curve(
    mu: pd.Series,
    cov: pd.DataFrame,
    weight_bounds: tuple,
    n_points: int,
) -> list[FrontierPoint]:
    """Trace the efficient frontier by targeting a range of returns."""
    min_ret = float(mu.min()) * 1.05
    max_ret = float(mu.max()) * 0.95
    target_returns = np.linspace(min_ret, max_ret, n_points)
    points = []

    for target in target_returns:
        try:
            ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
            ef.efficient_return(target_return=target)
            w = ef.clean_weights()
            perf = ef.portfolio_performance()
            points.append(
                FrontierPoint(
                    expected_return=round(perf[0], 4),
                    volatility=round(perf[1], 4),
                    sharpe=round(perf[2], 4),
                    weights=dict(w),
                )
            )
        except (OptimizationError, ValueError):
            continue

    return points


def _monte_carlo_portfolios(
    mu: np.ndarray,
    cov: np.ndarray,
    assets: list[str],
    n: int,
) -> list[FrontierPoint]:
    """Generate n random long-only portfolios."""
    points = []
    rng = np.random.default_rng(42)

    for _ in range(n):
        w = rng.dirichlet(np.ones(len(assets)))
        ret = float(w @ mu)
        vol = float(np.sqrt(w @ cov @ w))
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

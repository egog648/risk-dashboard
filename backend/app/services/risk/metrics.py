"""Risk metric calculations.

All functions operate on pandas Series of prices or returns.
"""
import numpy as np
import pandas as pd


def compute_returns(prices: pd.Series, method: str = "log") -> pd.Series:
    """Compute daily returns from a price series."""
    if method == "log":
        return np.log(prices / prices.shift(1)).dropna()
    return prices.pct_change().dropna()


def realized_volatility(prices: pd.Series, window: int = 63) -> float:
    """Annualized realized volatility over a rolling window (default ~3 months)."""
    returns = compute_returns(prices)
    if len(returns) < window:
        return float(returns.std() * np.sqrt(252))
    return float(returns.tail(window).std() * np.sqrt(252))


def sharpe_ratio(prices: pd.Series, risk_free_rate: float, window: int = 252) -> float:
    """Annualized Sharpe ratio. risk_free_rate should be annualized (e.g. 0.05)."""
    returns = compute_returns(prices)
    if len(returns) < window:
        return float("nan")
    r = returns.tail(window)
    excess = r.mean() * 252 - risk_free_rate
    vol = r.std() * np.sqrt(252)
    if vol == 0:
        return float("nan")
    return float(excess / vol)


def sortino_ratio(prices: pd.Series, risk_free_rate: float, window: int = 252) -> float:
    """Annualized Sortino ratio (uses downside deviation only)."""
    returns = compute_returns(prices)
    if len(returns) < window:
        return float("nan")
    r = returns.tail(window)
    excess = r.mean() * 252 - risk_free_rate
    downside = r[r < 0].std() * np.sqrt(252)
    if downside == 0:
        return float("nan")
    return float(excess / downside)


def max_drawdown(prices: pd.Series) -> float:
    """Maximum peak-to-trough drawdown as a negative fraction."""
    rolling_max = prices.cummax()
    drawdown = (prices - rolling_max) / rolling_max
    return float(drawdown.min())


def value_at_risk(prices: pd.Series, confidence: float = 0.95, window: int = 252) -> float:
    """Historical VaR at given confidence level (negative = loss)."""
    returns = compute_returns(prices)
    if len(returns) < window:
        r = returns
    else:
        r = returns.tail(window)
    return float(np.percentile(r, (1 - confidence) * 100))


def conditional_var(prices: pd.Series, confidence: float = 0.95, window: int = 252) -> float:
    """CVaR / Expected Shortfall — mean of returns below VaR threshold."""
    returns = compute_returns(prices)
    if len(returns) < window:
        r = returns
    else:
        r = returns.tail(window)
    var = np.percentile(r, (1 - confidence) * 100)
    tail = r[r <= var]
    if tail.empty:
        return float(var)
    return float(tail.mean())


def correlation_matrix(price_dict: dict[str, pd.Series]) -> pd.DataFrame:
    """Compute pairwise correlation matrix from a dict of price series."""
    returns = {k: compute_returns(v) for k, v in price_dict.items()}
    df = pd.DataFrame(returns).dropna()
    return df.corr()


def ewma_covariance(price_dict: dict[str, pd.Series], span: int = 252) -> pd.DataFrame:
    """Exponentially weighted covariance matrix (annualized)."""
    returns = {k: compute_returns(v) for k, v in price_dict.items()}
    df = pd.DataFrame(returns).dropna()
    return df.ewm(span=span).cov().iloc[-len(df.columns):] * 252


def compute_risk_score(
    vol: float,
    max_dd: float,
    var_99: float,
    valuation_z: float,
) -> float:
    """Composite 0-100 risk score. Higher = more risky.

    Combines realized vol, drawdown severity, VaR, and valuation stretch.
    Each component normalized to 0-25 and summed.
    """
    # Vol component: 0% = 0 pts, 40%+ = 25 pts
    vol_score = min(vol / 0.40 * 25, 25)

    # Drawdown component: 0% = 0 pts, -60%+ = 25 pts
    dd_score = min(abs(max_dd) / 0.60 * 25, 25)

    # VaR component: 0% = 0 pts, -5%+ daily = 25 pts
    var_score = min(abs(var_99) / 0.05 * 25, 25)

    # Valuation component: z=0 = 12.5 pts (neutral), z=+3 = 25 pts (expensive)
    val_score = min(max((valuation_z + 3) / 6 * 25, 0), 25)

    return round(vol_score + dd_score + var_score + val_score, 1)

"""Historical stress scenario replay for portfolio allocations."""

from __future__ import annotations

from datetime import date

import pandas as pd

from app.models.schemas import StressScenarioResult
from app.services.risk.metrics import max_drawdown

Q6_TOLERANCE: dict[str, float] = {
    "A": 0.0,
    "B": 0.10,
    "C": 0.15,
    "D": 0.25,
}

STRESS_WINDOWS: list[tuple[str, str, date, date]] = [
    ("gfc_2008", "Global Financial Crisis", date(2007, 10, 1), date(2009, 3, 31)),
    ("covid_2020", "COVID Crash", date(2020, 2, 1), date(2020, 4, 30)),
    ("rate_shock_2022", "Rate Shock", date(2022, 1, 1), date(2022, 10, 31)),
]


def q6_tolerance(q6_answer: str | None) -> float:
    if not q6_answer:
        return 0.15
    return Q6_TOLERANCE.get(q6_answer.upper(), 0.15)


def _normalize_index(series: pd.Series) -> pd.Series:
    s = series.sort_index()
    if not isinstance(s.index, pd.DatetimeIndex):
        s.index = pd.to_datetime(s.index)
    if s.index.tz is not None:
        s.index = s.index.tz_localize(None)
    return s


def portfolio_drawdown_in_window(
    weights: dict[str, float],
    price_dict: dict[str, pd.Series],
    start: date,
    end: date,
) -> float | None:
    """Buy-and-hold portfolio drawdown within a date window.

    Uses only assets with price coverage in the window; weights are renormalized.
    """
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    window_series: dict[str, pd.Series] = {}
    active_weights: dict[str, float] = {}

    for key, raw in price_dict.items():
        weight = weights.get(key, 0.0)
        if weight <= 0:
            continue

        series = _normalize_index(raw)
        window = series.loc[(series.index >= start_ts) & (series.index <= end_ts)]
        if len(window) < 5:
            continue

        window_series[key] = window / float(window.iloc[0])
        active_weights[key] = weight

    if not window_series:
        return None

    total = sum(active_weights.values())
    if total <= 0:
        return None
    active_weights = {k: v / total for k, v in active_weights.items()}

    aligned = pd.DataFrame(window_series).dropna()
    if len(aligned) < 5:
        return None

    weight_vec = pd.Series({k: active_weights[k] for k in aligned.columns})
    portfolio = (aligned * weight_vec).sum(axis=1)
    return max_drawdown(portfolio)


def run_stress_scenarios(
    weights: dict[str, float],
    price_dict: dict[str, pd.Series],
    q6_answer: str | None,
) -> list[StressScenarioResult]:
    tolerance = q6_tolerance(q6_answer)
    results: list[StressScenarioResult] = []

    for scenario_id, label, start, end in STRESS_WINDOWS:
        drawdown = portfolio_drawdown_in_window(weights, price_dict, start, end)
        if drawdown is None:
            continue

        exceeds = abs(drawdown) > tolerance + 1e-9
        results.append(
            StressScenarioResult(
                id=scenario_id,
                label=label,
                start=start,
                end=end,
                portfolio_drawdown=round(drawdown, 4),
                exceeds_tolerance=exceeds,
                tolerance_pct=round(tolerance, 4),
            )
        )

    return results

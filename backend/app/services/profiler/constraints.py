"""Derive optimizer constraints from profiler governor scores."""

from __future__ import annotations

from dataclasses import dataclass

from app.models.db_models import ClientProfile
from app.models.schemas import OptimizationConstraintsPayload


@dataclass(frozen=True)
class OptimizationConstraints:
    min_cash: float
    max_portfolio_vol: float | None
    weight_bounds: dict[str, tuple[float, float]] | None = None


def min_cash_from_cap(governor_cap_pct: float) -> float:
    if governor_cap_pct <= 30:
        return 0.20
    if governor_cap_pct <= 60:
        return 0.12
    return 0.05


def max_vol_from_cap(governor_cap_pct: float) -> float:
    """Map governor cap (0–100) to max annualized portfolio volatility."""
    return round(0.06 + (governor_cap_pct / 100) * 0.14, 4)


def constraints_from_governor_cap(governor_cap_pct: float) -> OptimizationConstraints:
    min_cash = min_cash_from_cap(governor_cap_pct)
    return OptimizationConstraints(
        min_cash=min_cash,
        max_portfolio_vol=max_vol_from_cap(governor_cap_pct),
        weight_bounds={"cash": (min_cash, 0.60)},
    )


def constraints_from_profile(profile: ClientProfile) -> OptimizationConstraints:
    return constraints_from_governor_cap(profile.governor_cap_pct)


def constraints_from_answers(
    answers: dict[str, str],
    governor_cap_pct: float,
) -> OptimizationConstraints:
    del answers  # reserved for future Q6-based vol tightening
    return constraints_from_governor_cap(governor_cap_pct)


def constraints_to_payload(constraints: OptimizationConstraints) -> OptimizationConstraintsPayload:
    return OptimizationConstraintsPayload(
        min_cash=constraints.min_cash,
        max_portfolio_vol=constraints.max_portfolio_vol,
    )


def payload_to_constraints(payload: OptimizationConstraintsPayload) -> OptimizationConstraints:
    min_cash = payload.min_cash if payload.min_cash is not None else 0.05
    weight_bounds = {"cash": (min_cash, 0.60)} if payload.min_cash is not None else None
    return OptimizationConstraints(
        min_cash=min_cash,
        max_portfolio_vol=payload.max_portfolio_vol,
        weight_bounds=weight_bounds,
    )

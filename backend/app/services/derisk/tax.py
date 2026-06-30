"""Tax calculations for de-risk analysis."""

import math

# 2026 trust bracket estimates (graduated view for UI detail)
TRUST_ORDINARY_BRACKETS = [
    (3_150, 0.10),
    (11_450, 0.24),
    (15_950, 0.35),
    (math.inf, 0.37),
]
TRUST_LTCG_BRACKETS = [
    (3_150, 0.00),
    (15_950, 0.15),
    (math.inf, 0.20),
]
NIIT_THRESHOLD = 15_950


def marginal_tax(gain: float, is_lt: bool, lt_rate: float, st_rate: float) -> float:
    """Marginal tax on a gain; losses return negative (harvest benefit)."""
    return gain * (lt_rate if is_lt else st_rate)


def bracket_tax(gain: float, brackets: list[tuple[float, float]]) -> float:
    if gain <= 0:
        return 0.0
    tax = 0.0
    prev = 0.0
    for threshold, rate in brackets:
        if gain <= prev:
            break
        taxable = min(gain, threshold) - prev
        tax += taxable * rate
        prev = threshold
    return tax


def niit_tax(gain: float, niit_rate: float, income_already_in_trust: float = 0) -> float:
    excess = max(0, income_already_in_trust + gain - NIIT_THRESHOLD)
    return min(gain, excess) * niit_rate


def lot_tax_estimate_graduated(
    gain: float,
    is_lt: bool,
    state_rate: float,
    niit_rate: float,
    income_in_trust: float = 0,
) -> dict:
    """Graduated trust bracket estimate for a single lot (exploratory UI view)."""
    if gain <= 0:
        return {
            "est_fed_tax": 0.0,
            "est_niit": 0.0,
            "est_state_tax": 0.0,
            "est_total_tax": 0.0,
            "est_effective_rate_pct": 0.0,
        }
    brackets = TRUST_LTCG_BRACKETS if is_lt else TRUST_ORDINARY_BRACKETS
    fed = bracket_tax(gain, brackets)
    niit = niit_tax(gain, niit_rate, income_in_trust)
    state = gain * state_rate
    total = fed + niit + state
    return {
        "est_fed_tax": round(fed, 2),
        "est_niit": round(niit, 2),
        "est_state_tax": round(state, 2),
        "est_total_tax": round(total, 2),
        "est_effective_rate_pct": round(total / gain * 100, 2) if gain > 0 else 0.0,
    }

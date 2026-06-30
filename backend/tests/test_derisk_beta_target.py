"""Beta-target tier mode tests for non-taxable accounts."""

from app.services.derisk.decision import build_decision_analysis
from app.services.derisk.tiers import build_beta_target_tiers
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary


def _make_synthetic_lots() -> list[dict]:
    """Three lots with different betas for beta-target testing."""
    return [
        {
            "ticker": "HIGH",
            "name": "High Beta",
            "section": "STOCKS",
            "trade_date": "2020-01-01",
            "holding_period": "LT",
            "quantity": 100,
            "market_value": 500_000,
            "unrealized_gl": 100_000,
            "stress_beta": 1.5,
            "tax_to_sell_marginal": 0,
        },
        {
            "ticker": "MED",
            "name": "Med Beta",
            "section": "STOCKS",
            "trade_date": "2020-01-01",
            "holding_period": "LT",
            "quantity": 100,
            "market_value": 400_000,
            "unrealized_gl": 50_000,
            "stress_beta": 1.0,
            "tax_to_sell_marginal": 0,
        },
        {
            "ticker": "LOW",
            "name": "Low Beta",
            "section": "STOCKS",
            "trade_date": "2020-01-01",
            "holding_period": "LT",
            "quantity": 100,
            "market_value": 100_000,
            "unrealized_gl": 10_000,
            "stress_beta": 0.5,
            "tax_to_sell_marginal": 0,
        },
    ]


def test_beta_target_tiers_reduce_beta():
    lots_detail = [
        {
            "ticker": "HIGH",
            "name": "High Beta",
            "section": "STOCKS",
            "trade_date": "2020-01-01",
            "holding_period": "LT",
            "quantity": 100,
            "market_value": 500_000,
            "total_cost": 400_000,
            "unrealized_gl": 100_000,
            "unrealized_gl_pct": 25.0,
        },
        {
            "ticker": "MED",
            "name": "Med Beta",
            "section": "STOCKS",
            "trade_date": "2020-01-01",
            "holding_period": "LT",
            "quantity": 100,
            "market_value": 400_000,
            "total_cost": 350_000,
            "unrealized_gl": 50_000,
            "unrealized_gl_pct": 14.3,
        },
        {
            "ticker": "LOW",
            "name": "Low Beta",
            "section": "STOCKS",
            "trade_date": "2020-01-01",
            "holding_period": "LT",
            "quantity": 100,
            "market_value": 100_000,
            "total_cost": 90_000,
            "unrealized_gl": 10_000,
            "unrealized_gl_pct": 11.1,
        },
    ]
    stress = {"HIGH": 1.5, "MED": 1.0, "LOW": 0.5}
    summary = PortfolioSummary(total=1_100_000, cash=100_000)
    assumptions = DeriskAssumptionsConfig(
        tax_treatment="traditional_ira",
        tier_mode="beta_target",
        beta_targets=[0.90, 0.75, 0.60],
    )
    decision = build_decision_analysis(lots_detail, stress, summary, assumptions)
    tiers = build_beta_target_tiers(decision["lots"], summary, assumptions)

    beta_before = tiers["hold_all"]["beta_incl_cash"]
    assert beta_before > 0

    prev_beta = beta_before
    for tier in tiers["tiers"]:
        assert tier["beta_after"] <= prev_beta
        assert tier["gross_tax"] == 0
        prev_beta = tier["beta_after"]


def test_non_taxable_lots_have_zero_tax():
    assumptions = DeriskAssumptionsConfig(tax_treatment="roth_ira", tier_mode="beta_target")
    assert assumptions.lt_rate == 0.0
    assert assumptions.st_rate == 0.0

    lots = _make_synthetic_lots()
    summary = PortfolioSummary(total=1_100_000, cash=100_000)
    decision = build_decision_analysis(lots, {"HIGH": 1.5, "MED": 1.0, "LOW": 0.5}, summary, assumptions)
    assert all(lot["tax_to_sell_marginal"] == 0 for lot in decision["lots"])

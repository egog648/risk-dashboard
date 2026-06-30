"""Golden-master regression tests for de-risk engine."""

import json
from pathlib import Path

import pytest

from app.services.derisk.decision import build_decision_analysis
from app.services.derisk.runner import run_analysis
from app.services.derisk.tiers import build_tax_budget_tiers
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary

FIXTURES = Path(__file__).resolve().parents[2] / "prospect_derisk_module" / "fixtures"


@pytest.fixture
def golden_inputs():
    portfolio = json.loads((FIXTURES / "corrected_portfolio.json").read_text())
    tax_analysis = json.loads((FIXTURES / "tax_analysis.json").read_text())
    return portfolio, tax_analysis


@pytest.fixture
def default_assumptions():
    return DeriskAssumptionsConfig()


@pytest.fixture
def portfolio_summary(golden_inputs):
    portfolio, _ = golden_inputs
    s = portfolio["summary"]
    return PortfolioSummary(total=s["grand_total_current"], cash=s["cash_mv"])


@pytest.fixture
def stress_betas(golden_inputs):
    portfolio, _ = golden_inputs
    return {p["ticker"]: p.get("stress_beta", 1.0) for p in portfolio["positions"]}


def test_decision_analysis_lot_count(golden_inputs, stress_betas, portfolio_summary, default_assumptions):
    _, tax_analysis = golden_inputs
    expected = json.loads((FIXTURES / "decision_analysis.json").read_text())
    result = build_decision_analysis(
        tax_analysis["lots_detail"],
        stress_betas,
        portfolio_summary,
        default_assumptions,
    )
    assert len(result["lots"]) == len(expected["lots"])


def test_tax_budget_tiers_acceptance_table(golden_inputs, stress_betas, portfolio_summary, default_assumptions):
    _, tax_analysis = golden_inputs
    decision = build_decision_analysis(
        tax_analysis["lots_detail"],
        stress_betas,
        portfolio_summary,
        default_assumptions,
    )
    tiers = build_tax_budget_tiers(decision["lots"], portfolio_summary, default_assumptions)

    expected_rows = [
        (250_000, 108, 249_998, 3_311_269, 0.5094),
        (500_000, 130, 499_946, 4_595_402, 0.3850),
        (750_000, 158, 749_929, 5_659_697, 0.2807),
    ]

    assert round(tiers["hold_all"]["beta_incl_cash"], 4) == 0.7614

    for tier, (budget, n_lots, tax_paid, proceeds, beta_after) in zip(
        tiers["tiers"], expected_rows, strict=True
    ):
        assert tier["budget"] == budget
        assert tier["n_lots"] == n_lots
        assert abs(tier["gross_tax"] - tax_paid) <= 2
        assert abs(tier["proceeds"] - proceeds) <= 500
        assert abs(tier["beta_after"] - beta_after) < 0.001


def test_full_pipeline_matches_sell_tiers_fixture(
    golden_inputs, stress_betas, portfolio_summary, default_assumptions
):
    _, tax_analysis = golden_inputs
    result = run_analysis(
        tax_analysis["lots_detail"],
        stress_betas,
        portfolio_summary,
        default_assumptions,
    )
    expected = json.loads((FIXTURES / "sell_tiers.json").read_text())
    for actual, exp in zip(result["tiers"]["tiers"], expected["tiers"], strict=True):
        assert actual["budget"] == exp["budget"]
        assert actual["n_lots"] == exp["n_lots"]
        assert abs(actual["beta_after"] - exp["beta_after"]) < 0.001

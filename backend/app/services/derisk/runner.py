"""Run full de-risk analysis pipeline (pure functions)."""

from app.services.derisk.decision import build_decision_analysis
from app.services.derisk.sell_list import build_sell_list
from app.services.derisk.tiers import build_tiers
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary


def run_analysis(
    lots_detail: list[dict],
    stress_beta_by_ticker: dict[str, float],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    """Execute decision → tiers → sell list pipeline."""
    decision = build_decision_analysis(lots_detail, stress_beta_by_ticker, summary, assumptions)
    lot_rows = decision["lots"]
    tiers = build_tiers(lot_rows, summary, assumptions)
    sell_list = build_sell_list(lot_rows, summary, assumptions)
    return {
        "decision": decision,
        "tiers": tiers,
        "sell_list": sell_list,
        "beta_before": tiers["hold_all"]["beta_incl_cash"],
    }

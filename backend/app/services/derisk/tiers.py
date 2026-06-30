"""Greedy tier selection for tax-budget and beta-target de-risk modes."""

from app.services.derisk.risk import portfolio_beta_incl_cash
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary


def lot_efficiency(lot: dict) -> tuple:
    """Ranking key: harvest/zero-tax first, then most beta-$ per tax $."""
    tax = lot["tax_to_sell_marginal"]
    beta_d = lot["market_value"] * lot["stress_beta"]
    if tax <= 0:
        return (0, -beta_d)
    return (1, -(beta_d / tax))


def rank_lots(lots: list[dict]) -> list[dict]:
    return sorted(lots, key=lot_efficiency)


def _tier_protection(beta_d_removed: float, drawdown_pcts: list[int]) -> dict:
    return {f"dd_{d}": round(beta_d_removed * d / 100, 2) for d in drawdown_pcts}


def _summarize_selection(
    selected: list[dict],
    summary: PortfolioSummary,
    beta_d_total: float,
    beta_before: float,
    dist_rate: float,
    drawdown_pcts: list[int],
) -> dict:
    proceeds = sum(l["market_value"] for l in selected)
    gross_tax = sum(max(l["tax_to_sell_marginal"], 0) for l in selected)
    net_tax = sum(l["tax_to_sell_marginal"] for l in selected)
    beta_d_removed = sum(l["market_value"] * l["stress_beta"] for l in selected)
    total = summary.total
    cash0 = summary.cash
    equity0 = summary.equity
    new_total = total - gross_tax
    new_cash = cash0 + (proceeds - gross_tax)
    new_equity = equity0 - proceeds
    new_beta_d = beta_d_total - beta_d_removed
    new_beta = new_beta_d / new_total if new_total > 0 else 0.0
    dist = dist_rate * total
    return {
        "n_lots": len(selected),
        "proceeds": round(proceeds, 2),
        "gross_tax": round(gross_tax, 2),
        "net_tax_incl_harvest": round(net_tax, 2),
        "beta_dollars_removed": round(beta_d_removed, 2),
        "new_total": round(new_total, 2),
        "new_cash": round(new_cash, 2),
        "new_cash_pct": round(new_cash / new_total * 100, 2) if new_total > 0 else 0.0,
        "new_equity": round(new_equity, 2),
        "beta_before": round(beta_before, 4),
        "beta_after": round(new_beta, 4),
        "drawdown_protection": _tier_protection(beta_d_removed, drawdown_pcts),
        "runway_years_after": round(new_cash / dist, 2) if dist > 0 else 0.0,
    }


def select_for_tax_budget(ranked: list[dict], budget: float) -> list[dict]:
    selected: list[dict] = []
    tax = 0.0
    for lot in ranked:
        lot_tax = max(lot["tax_to_sell_marginal"], 0)
        if tax + lot_tax > budget:
            continue
        selected.append(lot)
        tax += lot_tax
    return selected


def select_for_beta_target(
    ranked: list[dict],
    target_beta: float,
    summary: PortfolioSummary,
    beta_d_total: float,
) -> list[dict]:
    """Greedily add lots until portfolio beta_after <= target."""
    selected: list[dict] = []
    total = summary.total
    cash0 = summary.cash
    gross_tax = 0.0

    for lot in ranked:
        candidate = selected + [lot]
        proceeds = sum(l["market_value"] for l in candidate)
        gross_tax = sum(max(l["tax_to_sell_marginal"], 0) for l in candidate)
        beta_d_removed = sum(l["market_value"] * l["stress_beta"] for l in candidate)
        new_total = total - gross_tax
        if new_total <= 0:
            continue
        new_beta = (beta_d_total - beta_d_removed) / new_total
        if new_beta <= target_beta:
            selected.append(lot)
        # skip lots that don't help reach target yet; keep scanning

    return selected


def build_hold_all(
    lots: list[dict],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    beta_d_total = sum(l["market_value"] * l["stress_beta"] for l in lots)
    beta_incl_cash = portfolio_beta_incl_cash(beta_d_total, summary.total)
    dist = assumptions.dist_rate * summary.total
    drawdown_pcts = assumptions.drawdown_pcts
    return {
        "total": summary.total,
        "cash": summary.cash,
        "beta_incl_cash": round(beta_incl_cash, 4),
        "drawdown_loss": _tier_protection(beta_d_total, drawdown_pcts),
        "distribution_5pct": round(dist, 2),
        "runway_years": round(summary.cash / dist, 2) if dist > 0 else 0.0,
    }


def build_tax_budget_tiers(
    lots: list[dict],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    ranked = rank_lots(lots)
    beta_d_total = sum(l["market_value"] * l["stress_beta"] for l in lots)
    beta_before = portfolio_beta_incl_cash(beta_d_total, summary.total)
    hold_all = build_hold_all(lots, summary, assumptions)
    tiers = []
    for budget in assumptions.tax_budgets:
        selected = select_for_tax_budget(ranked, budget)
        tier_data = _summarize_selection(
            selected,
            summary,
            beta_d_total,
            beta_before,
            assumptions.dist_rate,
            assumptions.drawdown_pcts,
        )
        tier_data["budget"] = budget
        tiers.append(tier_data)

    return {"hold_all": hold_all, "tiers": tiers}


def build_beta_target_tiers(
    lots: list[dict],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    ranked = rank_lots(lots)
    beta_d_total = sum(l["market_value"] * l["stress_beta"] for l in lots)
    beta_before = portfolio_beta_incl_cash(beta_d_total, summary.total)
    hold_all = build_hold_all(lots, summary, assumptions)

    targets = assumptions.beta_targets
    if not targets or all(t >= beta_before for t in targets):
        step = max(0.05, beta_before * 0.15)
        targets = [
            round(beta_before - step * (i + 1), 4)
            for i in range(3)
            if beta_before - step * (i + 1) > 0
        ]

    tiers = []
    prev_selected: list[dict] = []
    for target in sorted(targets, reverse=True):
        selected = select_for_beta_target(ranked, target, summary, beta_d_total)
        if len(selected) < len(prev_selected):
            selected = prev_selected
        prev_selected = selected
        tier_data = _summarize_selection(
            selected,
            summary,
            beta_d_total,
            beta_before,
            assumptions.dist_rate,
            assumptions.drawdown_pcts,
        )
        tier_data["budget"] = target
        tier_data["beta_target"] = target
        tiers.append(tier_data)

    return {"hold_all": hold_all, "tiers": tiers, "tier_mode": "beta_target"}


def build_tiers(
    lots: list[dict],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    if assumptions.tier_mode == "beta_target":
        return build_beta_target_tiers(lots, summary, assumptions)
    return build_tax_budget_tiers(lots, summary, assumptions)

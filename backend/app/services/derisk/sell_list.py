"""Per-tier sell list with lot tagging and position rollups."""

from collections import defaultdict

from app.services.derisk.risk import portfolio_beta_incl_cash
from app.services.derisk.tiers import rank_lots, select_for_beta_target, select_for_tax_budget
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary


def lot_key(lot: dict) -> tuple:
    return (
        lot["ticker"],
        lot.get("trade_date"),
        lot.get("holding_period"),
        round(lot["market_value"], 2),
        round(lot.get("unrealized_gl", 0), 2),
    )


def _summarize_tier(
    selected: list[dict],
    summary: PortfolioSummary,
    beta_d_total: float,
    dist_rate: float,
    drawdown_pcts: list[int],
) -> dict:
    proceeds = sum(l["market_value"] for l in selected)
    gross_tax = sum(max(l["tax_to_sell_marginal"], 0) for l in selected)
    net_tax = sum(l["tax_to_sell_marginal"] for l in selected)
    beta_d_removed = sum(l["market_value"] * l["stress_beta"] for l in selected)
    new_total = summary.total - gross_tax
    new_cash = summary.cash + (proceeds - gross_tax)
    new_beta = (beta_d_total - beta_d_removed) / new_total if new_total > 0 else 0.0
    dist = dist_rate * summary.total
    return {
        "n_lots": len(selected),
        "proceeds": proceeds,
        "gross_tax": gross_tax,
        "net_tax_incl_harvest": net_tax,
        "beta_dollars_removed": beta_d_removed,
        "new_total": new_total,
        "new_cash": new_cash,
        "new_cash_pct": new_cash / new_total * 100 if new_total > 0 else 0.0,
        "beta_after": new_beta,
        "runway_after": new_cash / dist if dist > 0 else 0.0,
        "protection": {f"dd_{d}": beta_d_removed * d / 100 for d in drawdown_pcts},
    }


def position_rollup(sold_lots: list[dict], entry_tier: float) -> list[dict]:
    agg = defaultdict(
        lambda: {
            "name": "",
            "lots": 0,
            "qty": 0.0,
            "mv": 0.0,
            "gl": 0.0,
            "tax": 0.0,
            "betad": 0.0,
            "beta": 0.0,
        }
    )
    for row in sold_lots:
        if row["entry_tier"] != entry_tier:
            continue
        a = agg[row["ticker"]]
        a["name"] = row["name"]
        a["beta"] = row["stress_beta"]
        a["lots"] += 1
        a["qty"] += row.get("quantity") or 0
        a["mv"] += row["market_value"]
        a["gl"] += row.get("unrealized_gl") or 0
        a["tax"] += row["tax_to_sell"]
        a["betad"] += row["beta_dollars_removed"]
    rows = [{"ticker": tk, **a} for tk, a in agg.items()]
    rows.sort(key=lambda x: -x["betad"])
    return rows


def build_sell_list(
    lots: list[dict],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    ranked = rank_lots(lots)
    beta_d_total = sum(l["market_value"] * l["stress_beta"] for l in lots)
    beta_incl_cash = portfolio_beta_incl_cash(beta_d_total, summary.total)
    dist = assumptions.dist_rate * summary.total
    drawdown_pcts = assumptions.drawdown_pcts

    if assumptions.tier_mode == "beta_target":
        targets = assumptions.beta_targets
        beta_before = beta_incl_cash
        if not targets or all(t >= beta_before for t in targets):
            step = max(0.05, beta_before * 0.15)
            targets = [
                round(beta_before - step * (i + 1), 4)
                for i in range(3)
                if beta_before - step * (i + 1) > 0
            ]
        budgets = sorted(targets, reverse=True)
        selections = {
            t: select_for_beta_target(ranked, t, summary, beta_d_total) for t in budgets
        }
    else:
        budgets = assumptions.tax_budgets
        selections = {b: select_for_tax_budget(ranked, b) for b in budgets}

    tier_of: dict[tuple, float] = {}
    for budget in sorted(budgets):
        for lot in selections[budget]:
            key = lot_key(lot)
            if key not in tier_of:
                tier_of[key] = budget

    tier_summ = {b: _summarize_tier(selections[b], summary, beta_d_total, assumptions.dist_rate, drawdown_pcts) for b in budgets}

    sold_lots = []
    for lot in ranked:
        key = lot_key(lot)
        if key in tier_of:
            beta_d = lot["market_value"] * lot["stress_beta"]
            tax = lot["tax_to_sell_marginal"]
            sold_lots.append(
                {
                    "ticker": lot["ticker"],
                    "name": lot.get("name", ""),
                    "trade_date": lot.get("trade_date"),
                    "term": lot.get("holding_period"),
                    "quantity": lot.get("quantity"),
                    "market_value": lot["market_value"],
                    "unrealized_gl": lot.get("unrealized_gl"),
                    "stress_beta": lot["stress_beta"],
                    "tax_to_sell": tax,
                    "beta_dollars_removed": beta_d,
                    "exposure_per_tax_dollar": (beta_d / tax) if tax > 0 else None,
                    "entry_tier": tier_of[key],
                }
            )

    incremental = {b: position_rollup(sold_lots, b) for b in budgets}

    return {
        "hold_all": {
            "total": summary.total,
            "cash": summary.cash,
            "beta_incl_cash": beta_incl_cash,
            "distribution_5pct": dist,
            "runway_years": summary.cash / dist if dist > 0 else 0.0,
        },
        "tier_summary": tier_summ,
        "sold_lots": sold_lots,
        "incremental_positions": incremental,
        "tier_mode": assumptions.tier_mode,
    }

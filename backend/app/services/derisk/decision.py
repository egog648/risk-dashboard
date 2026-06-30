"""Per-lot risk-vs-tax decision analytic."""

from collections import defaultdict

from app.services.derisk.tax import marginal_tax
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary


def build_decision_analysis(
    lots_detail: list[dict],
    stress_beta_by_ticker: dict[str, float],
    summary: PortfolioSummary,
    assumptions: DeriskAssumptionsConfig,
) -> dict:
    """Build decision analysis from tax lot detail and stress betas."""
    drawdowns = assumptions.drawdowns
    ref_dd = assumptions.dd2
    lt_rate = assumptions.lt_rate
    st_rate = assumptions.st_rate

    lot_rows: list[dict] = []
    for lot in lots_detail:
        ticker = lot["ticker"]
        mv = lot["market_value"]
        gl = lot["unrealized_gl"]
        is_lt = lot.get("holding_period") == "LT"
        beta = stress_beta_by_ticker.get(ticker, lot.get("stress_beta", 1.0))
        tax = round(marginal_tax(gl, is_lt, lt_rate, st_rate), 2)
        dd_loss = {f"dd_{int(x * 100)}": round(mv * beta * x, 2) for x in drawdowns}
        risk_dollars = mv * beta
        breakeven = round(tax / risk_dollars, 4) if risk_dollars > 0 else None
        prot_ratio = round((mv * beta * ref_dd) / tax, 2) if tax > 0 else None
        lot_rows.append(
            {
                "ticker": ticker,
                "name": lot.get("name", ""),
                "section": lot.get("section", ""),
                "trade_date": lot.get("trade_date"),
                "holding_period": lot.get("holding_period"),
                "quantity": lot.get("quantity"),
                "market_value": mv,
                "cost": lot.get("total_cost", lot.get("cost", 0)),
                "unrealized_gl": gl,
                "unrealized_gl_pct": lot.get("unrealized_gl_pct"),
                "stress_beta": beta,
                "tax_to_sell_marginal": tax,
                **dd_loss,
                "breakeven_drawdown_pct": round(breakeven * 100, 2) if breakeven is not None else None,
                "protect_per_tax_dollar_at_30": prot_ratio,
            }
        )

    pos = defaultdict(
        lambda: {
            "mv": 0.0,
            "gl": 0.0,
            "tax": 0.0,
            "dd": {f"dd_{int(x * 100)}": 0.0 for x in drawdowns},
            "name": "",
            "section": "",
            "beta": 0.0,
        }
    )
    for row in lot_rows:
        p = pos[row["ticker"]]
        p["name"] = row["name"]
        p["section"] = row["section"]
        p["beta"] = row["stress_beta"]
        p["mv"] += row["market_value"]
        p["gl"] += row["unrealized_gl"]
        p["tax"] += row["tax_to_sell_marginal"]
        for x in drawdowns:
            p["dd"][f"dd_{int(x * 100)}"] += row[f"dd_{int(x * 100)}"]

    pos_rows = []
    for ticker, p in pos.items():
        risk_d = p["mv"] * p["beta"]
        breakeven = (p["tax"] / risk_d) if risk_d > 0 else None
        pos_rows.append(
            {
                "ticker": ticker,
                "name": p["name"],
                "section": p["section"],
                "market_value": round(p["mv"], 2),
                "unrealized_gl": round(p["gl"], 2),
                "stress_beta": p["beta"],
                "tax_to_exit": round(p["tax"], 2),
                "dd_20": round(p["dd"]["dd_20"], 2),
                "dd_30": round(p["dd"]["dd_30"], 2),
                "dd_40": round(p["dd"]["dd_40"], 2),
                "breakeven_drawdown_pct": round(breakeven * 100, 2) if breakeven is not None else None,
                "beta_dollars": round(risk_d, 2),
                "beta_dollars_per_tax_dollar": round(risk_d / p["tax"], 2) if p["tax"] > 0 else None,
            }
        )

    def sell_set(threshold_pct: float) -> dict:
        sel = [
            r
            for r in lot_rows
            if (
                r["breakeven_drawdown_pct"] is not None
                and r["breakeven_drawdown_pct"] < threshold_pct
            )
            or r["tax_to_sell_marginal"] <= 0
        ]
        mv = sum(r["market_value"] for r in sel)
        tax = sum(max(r["tax_to_sell_marginal"], 0) for r in sel)
        tax_net = sum(r["tax_to_sell_marginal"] for r in sel)
        beta_d = sum(r["market_value"] * r["stress_beta"] for r in sel)
        prot = {
            f"dd_{int(x * 100)}": round(sum(r[f"dd_{int(x * 100)}"] for r in sel), 2)
            for x in drawdowns
        }
        return {
            "threshold_pct": threshold_pct,
            "n_lots": len(sel),
            "proceeds_mv": round(mv, 2),
            "gross_tax": round(tax, 2),
            "net_tax_incl_harvest": round(tax_net, 2),
            "beta_dollars_removed": round(beta_d, 2),
            "drawdown_protection": prot,
        }

    sets = {f"corr_{int(x * 100)}": sell_set(x * 100) for x in drawdowns}
    sec_dd = {
        f"dd_{int(x * 100)}": round(sum(r[f"dd_{int(x * 100)}"] for r in lot_rows), 2)
        for x in drawdowns
    }

    return {
        "method": {
            "tax": f"marginal LT {lt_rate:.1%} / ST {st_rate:.1%}",
            "drawdown": "L = market_value * stress_beta * drawdown",
            "breakeven": "BE% = tax_to_sell / (market_value * stress_beta)",
            "sell_rule": "recommend lots with breakeven below scenario threshold (or loss lots)",
        },
        "portfolio": {
            "total_mv": summary.total,
            "cash_mv": summary.cash,
            "full_exit_tax_marginal": round(
                sum(max(r["tax_to_sell_marginal"], 0) for r in lot_rows), 2
            ),
            "hold_all_drawdown_loss": sec_dd,
        },
        "recommended_sets": sets,
        "position_ranking": sorted(
            pos_rows,
            key=lambda x: (x["beta_dollars_per_tax_dollar"] is None, -(x["beta_dollars_per_tax_dollar"] or 0)),
        ),
        "lots": lot_rows,
    }

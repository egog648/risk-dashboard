#!/usr/bin/env python3
"""
tax_engine.py  — Module 5: Trust Tax Engine
Finesse Funds Investments · Prospect Portfolio Calculator

Models tax liability for a TRUST entity using 2026 compressed tax brackets.
Analyzes:
  - Estimated tax on REALIZED gains (if any positions were sold)
  - Estimated tax on UNREALIZED gains by lot (if sold today)
  - LT vs ST breakdown and blended effective rates
  - Net Investment Income Tax (NIIT) — 3.8% for trusts
  - Tax-loss harvesting opportunities (positions with unrealized losses)
  - Lot-by-lot "to-sell" ranking: least tax-efficient first

NOTE: These are estimates only. Not tax advice.
      Verify 2026 bracket thresholds with a CPA before acting.

Usage:
    python tax_engine.py [enriched_portfolio.json] [tax_analysis.json]
"""

import json, sys, math
from pathlib import Path
from datetime import datetime, date

SCRIPT_DIR = Path(__file__).parent

# ─── 2026 Trust Tax Brackets ─────────────────────────────────────────────────
# Source: IRS Rev. Proc. (2025 + ~2.8% COLA estimate for 2026)
# IMPORTANT: confirm final 2026 IRS publication before filing/advising.

# Ordinary income brackets for TRUSTS (2026 estimates)
# Trusts hit the top bracket at ~$15,950 — dramatically compressed vs. individuals
TRUST_ORDINARY_BRACKETS = [
    (3_150,  0.10),
    (11_450, 0.24),
    (15_950, 0.35),
    (math.inf, 0.37),
]

# Long-term capital gains brackets for TRUSTS (2026 estimates)
TRUST_LTCG_BRACKETS = [
    (3_150,  0.00),
    (15_950, 0.15),
    (math.inf, 0.20),
]

# Net Investment Income Tax — flat 3.8% on NII for trusts when undistributed
# income exceeds the top bracket threshold (~$15,950 for 2026)
NIIT_RATE      = 0.038
NIIT_THRESHOLD = 15_950   # Same as 39.6% ordinary bracket for trusts

# State tax — set to 0 if trust is in a no-income-tax state;
# update to your state's rate (e.g., CA = 0.133, NY = 0.109)
STATE_RATE = 0.044  # Colorado flat income tax rate (2026)


# ─── Tax calculation helpers ──────────────────────────────────────────────────

def bracket_tax(gain, brackets):
    """Calculate tax owed on `gain` using the provided graduated bracket table."""
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


def effective_rate(gain, brackets):
    if gain <= 0:
        return 0.0
    return bracket_tax(gain, brackets) / gain


def niit_tax(gain, income_already_in_trust=0):
    """
    NIIT applies to the lesser of: NII or the amount by which AGI exceeds threshold.
    For simplicity (and conservatism), we assume all NII is above the threshold.
    """
    excess = max(0, income_already_in_trust + gain - NIIT_THRESHOLD)
    return min(gain, excess) * NIIT_RATE


def lot_tax_estimate(gain, is_lt, income_in_trust=0):
    """
    Total estimated federal tax on a single gain realization.
    Returns (federal_tax, niit_tax, state_tax, total_tax, effective_rate_pct)
    """
    if gain <= 0:
        return 0, 0, 0, 0, 0.0

    brackets = TRUST_LTCG_BRACKETS if is_lt else TRUST_ORDINARY_BRACKETS
    fed_tax  = bracket_tax(gain, brackets)
    niit     = niit_tax(gain, income_in_trust)
    state    = gain * STATE_RATE
    total    = fed_tax + niit + state
    eff_rate = total / gain if gain > 0 else 0

    return (
        round(fed_tax, 2),
        round(niit, 2),
        round(state, 2),
        round(total, 2),
        round(eff_rate * 100, 2),
    )


# ─── Portfolio analysis ───────────────────────────────────────────────────────

def analyze_taxes(enriched_path, output_path):
    with open(enriched_path) as f:
        data = json.load(f)

    today_str = date.today().isoformat()
    positions = data["positions"]

    lots_detail = []
    summary = {
        "lt_gain":    0.0, "lt_loss":    0.0,
        "st_gain":    0.0, "st_loss":    0.0,
        "lt_tax_est": 0.0, "st_tax_est": 0.0,
        "niit_est":   0.0, "state_est":  0.0,
        "total_tax_est": 0.0,
        "harvesting_opportunities": [],
    }

    for p in positions:
        if p.get("section") == "MONEY_MARKET":
            continue
        ticker   = p["ticker"]
        name     = p.get("name", "")
        cur_px   = p.get("current_price") or 0
        section  = p.get("section", "STOCKS")

        for lot in p.get("lots", []):
            qty  = lot.get("quantity") or 0
            uc   = lot.get("unit_cost") or 0
            tc   = lot.get("total_cost") or (qty * uc)
            hp   = lot.get("holding_period", "LT")
            td   = lot.get("trade_date", "")
            is_lt= hp == "LT"

            if qty <= 0 or cur_px <= 0:
                continue

            mv         = qty * cur_px
            unreal     = mv - tc
            fed, niit, state, total_tax, eff_pct = lot_tax_estimate(
                max(0, unreal), is_lt
            )
            net_after_tax = unreal - total_tax

            lot_row = {
                "ticker":            ticker,
                "name":              name,
                "section":           section,
                "trade_date":        td,
                "holding_period":    hp,
                "quantity":          qty,
                "unit_cost":         uc,
                "total_cost":        round(tc, 2),
                "current_price":     cur_px,
                "market_value":      round(mv, 2),
                "unrealized_gl":     round(unreal, 2),
                "unrealized_gl_pct": round(unreal / tc * 100, 2) if tc else None,
                "est_fed_tax":       fed,
                "est_niit":          niit,
                "est_state_tax":     state,
                "est_total_tax":     total_tax,
                "est_effective_rate_pct": eff_pct,
                "est_net_after_tax": round(net_after_tax, 2),
            }
            lots_detail.append(lot_row)

            # Accumulate summary
            if unreal >= 0:
                if is_lt:
                    summary["lt_gain"]    += unreal
                    summary["lt_tax_est"] += fed
                else:
                    summary["st_gain"]    += unreal
                    summary["st_tax_est"] += fed
                summary["niit_est"]  += niit
                summary["state_est"] += state
            else:
                if is_lt:
                    summary["lt_loss"] += unreal   # negative
                else:
                    summary["st_loss"] += unreal   # negative

    summary["total_tax_est"] = round(
        summary["lt_tax_est"] + summary["st_tax_est"]
        + summary["niit_est"] + summary["state_est"], 2
    )

    # Round all summary values
    for k in ("lt_gain","lt_loss","st_gain","st_loss",
              "lt_tax_est","st_tax_est","niit_est","state_est"):
        summary[k] = round(summary[k], 2)

    # Net gain/loss
    summary["net_lt_gl"]  = round(summary["lt_gain"] + summary["lt_loss"], 2)
    summary["net_st_gl"]  = round(summary["st_gain"] + summary["st_loss"], 2)
    summary["net_total_gl"] = round(summary["net_lt_gl"] + summary["net_st_gl"], 2)

    # Effective blended rate
    total_gain = summary["lt_gain"] + summary["st_gain"]
    summary["blended_eff_rate_pct"] = round(
        summary["total_tax_est"] / total_gain * 100, 2
    ) if total_gain > 0 else 0.0

    # Tax-loss harvesting candidates (positions with unrealized losses)
    harv = [
        {
            "ticker":        r["ticker"],
            "name":          r["name"],
            "holding_period":r["holding_period"],
            "trade_date":    r["trade_date"],
            "unrealized_gl": r["unrealized_gl"],
            "tax_savings_if_harvested":
                abs(lot_tax_estimate(abs(r["unrealized_gl"]),
                                     r["holding_period"] == "LT")[3]),
        }
        for r in lots_detail if r["unrealized_gl"] < 0
    ]
    harv.sort(key=lambda x: x["unrealized_gl"])   # worst losses first
    summary["harvesting_opportunities"] = harv

    total_harv_savings = sum(h["tax_savings_if_harvested"] for h in harv)
    summary["total_harvestable_savings"] = round(total_harv_savings, 2)

    # Least tax-efficient lots to sell (highest tax cost per dollar of gain)
    # Only include gains; sort by effective rate descending
    sell_ranking = sorted(
        [r for r in lots_detail if r["unrealized_gl"] > 500],
        key=lambda x: x["est_effective_rate_pct"],
        reverse=True
    )

    result = {
        "analyzed_at":   datetime.now().isoformat(),
        "analysis_date": today_str,
        "trust_tax_note": (
            "2026 trust brackets estimated; verify with CPA before advising. "
            f"State rate used: {STATE_RATE*100:.1f}%. "
            "NIIT: 3.8% applied on gains above $15,950 trust threshold."
        ),
        "summary":       summary,
        "lots_detail":   lots_detail,
        "sell_ranking_by_tax_cost": sell_ranking[:30],  # top 30 most tax-costly
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, default=str)

    # ── Print summary ───────────────────────────────────────────────────────
    s = summary
    print(f"\n{'='*60}")
    print(f"  TRUST TAX ANALYSIS  (2026 estimates)")
    print(f"{'='*60}")
    print(f"  LT unrealized gains:        ${s['lt_gain']:>12,.0f}")
    print(f"  LT unrealized losses:       ${s['lt_loss']:>12,.0f}")
    print(f"  ST unrealized gains:        ${s['st_gain']:>12,.0f}")
    print(f"  ST unrealized losses:       ${s['st_loss']:>12,.0f}")
    print(f"  Net total unrealized G/L:   ${s['net_total_gl']:>12,.0f}")
    print(f"")
    print(f"  Est. LT fed tax (if sold):  ${s['lt_tax_est']:>12,.0f}")
    print(f"  Est. ST fed tax (if sold):  ${s['st_tax_est']:>12,.0f}")
    print(f"  Est. NIIT (3.8%):           ${s['niit_est']:>12,.0f}")
    if STATE_RATE > 0:
        print(f"  Est. state tax:             ${s['state_est']:>12,.0f}")
    print(f"  TOTAL est. tax (if sold):   ${s['total_tax_est']:>12,.0f}")
    print(f"  Blended effective rate:     {s['blended_eff_rate_pct']:>11.1f}%")
    print(f"")
    print(f"  Tax-loss harvest opportunities: {len(harv)} lots")
    print(f"  Potential tax savings:      ${s['total_harvestable_savings']:>12,.0f}")
    if harv:
        print(f"\n  Top 5 harvest candidates:")
        for h in harv[:5]:
            print(f"    {h['ticker']:<8}  {h['holding_period']}  "
                  f"loss: ${h['unrealized_gl']:>10,.0f}  "
                  f"saves: ${h['tax_savings_if_harvested']:>8,.0f}")
    print(f"\n  Top 5 most tax-costly lots to sell:")
    for r in sell_ranking[:5]:
        print(f"    {r['ticker']:<8}  {r['holding_period']}  "
              f"gain: ${r['unrealized_gl']:>10,.0f}  "
              f"eff rate: {r['est_effective_rate_pct']:>5.1f}%")
    print(f"{'='*60}")
    print(f"  Output: {output_path}")

    return result


def main():
    base = SCRIPT_DIR
    inp  = Path(sys.argv[1]) if len(sys.argv) > 1 else base / "enriched_portfolio.json"
    out  = Path(sys.argv[2]) if len(sys.argv) > 2 else base / "tax_analysis.json"
    print(f"Input:  {inp}")
    analyze_taxes(inp, out)


if __name__ == "__main__":
    main()

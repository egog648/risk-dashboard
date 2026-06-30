#!/usr/bin/env python3
"""
build_sell_tiers.py  — WS2 recommended sell sets at 3 tax-budget tiers
Finesse Funds · Prospect Portfolio Calculator

For each tax budget (~$250K / $500K / $750K), greedily select tax lots in order of
exposure-removed-per-tax-dollar (loss/zero-tax lots first) until the budget is hit,
then report the resulting portfolio: beta, downside protection at -20/-30/-40,
new cash sleeve, and distribution runway.

Proceeds mechanics: selling a lot moves market value to cash; tax is paid out of the
portfolio. New total = old total - tax paid. New cash = old cash + (proceeds - tax).
"""
import json
from pathlib import Path

BASE = Path(__file__).parent
da  = json.load(open(BASE / "decision_analysis.json"))
corr = json.load(open(BASE / "corrected_portfolio.json"))["summary"]
lots = da["lots"]

TOTAL      = corr["grand_total_current"]
CASH0      = corr["cash_mv"]
EQUITY0    = TOTAL - CASH0
DIST       = 0.05 * TOTAL
BUDGETS    = [250_000, 500_000, 750_000]
DD         = [20, 30, 40]

# total securities beta-dollars (hold-all exposure)
BETA_D_TOTAL = sum(l["market_value"] * l["stress_beta"] for l in lots)
BETA_TOTAL_INCL_CASH = BETA_D_TOTAL / TOTAL

# rank lots: zero/negative-tax first (infinite efficiency), then beta-$ per tax-$ desc
def eff(l):
    t = l["tax_to_sell_marginal"]
    bd = l["market_value"] * l["stress_beta"]
    if t <= 0:
        return (0, -bd)            # group 0: harvest/zero-tax, biggest exposure first
    return (1, -(bd / t))          # group 1: most exposure per tax dollar first
ranked = sorted(lots, key=eff)

def build(budget):
    sel=[]; tax=0.0
    for l in ranked:
        t = max(l["tax_to_sell_marginal"], 0)
        if tax + t > budget:
            continue               # skip lots that would breach budget; keep scanning smaller ones
        sel.append(l); tax += t
    proceeds = sum(l["market_value"] for l in sel)
    net_tax  = sum(l["tax_to_sell_marginal"] for l in sel)     # incl harvest benefit
    gross_tax= sum(max(l["tax_to_sell_marginal"],0) for l in sel)
    beta_d_removed = sum(l["market_value"]*l["stress_beta"] for l in sel)
    # resulting portfolio
    new_total  = TOTAL - gross_tax
    new_cash   = CASH0 + (proceeds - gross_tax)
    new_equity = EQUITY0 - proceeds
    new_beta_d = BETA_D_TOTAL - beta_d_removed
    new_beta   = new_beta_d / new_total
    prot = {f"dd_{d}": round(beta_d_removed*d/100,2) for d in DD}
    # concentration remaining: top names still held
    held_mv={}
    sold_ticker_mv={}
    for l in sel: sold_ticker_mv[l["ticker"]]=sold_ticker_mv.get(l["ticker"],0)+l["market_value"]
    for l in lots:
        rem = l["market_value"] - 0
    return {
        "budget":budget,"n_lots":len(sel),"proceeds":round(proceeds,2),
        "gross_tax":round(gross_tax,2),"net_tax_incl_harvest":round(net_tax,2),
        "beta_dollars_removed":round(beta_d_removed,2),
        "new_total":round(new_total,2),"new_cash":round(new_cash,2),
        "new_cash_pct":round(new_cash/new_total*100,2),
        "new_equity":round(new_equity,2),
        "beta_before":round(BETA_TOTAL_INCL_CASH,4),"beta_after":round(new_beta,4),
        "drawdown_protection":prot,
        "runway_years_after":round(new_cash/DIST,2),
    }

tiers=[build(b) for b in BUDGETS]
json.dump({"hold_all":{"total":TOTAL,"cash":CASH0,"beta_incl_cash":round(BETA_TOTAL_INCL_CASH,4),
                       "drawdown_loss":{f"dd_{d}":round(BETA_D_TOTAL*d/100,2) for d in DD},
                       "distribution_5pct":round(DIST,2),"runway_years":round(CASH0/DIST,2)},
           "tiers":tiers}, open(BASE/"sell_tiers.json","w"), indent=1)

# report
print("="*78)
print("  DE-RISK TIERS  (max exposure removed per tax dollar, capped by tax budget)")
print("="*78)
print(f"  HOLD ALL: total ${TOTAL:,.0f} | cash ${CASH0:,.0f} ({CASH0/TOTAL*100:.1f}%) | "
      f"beta {BETA_TOTAL_INCL_CASH:.2f} | runway {CASH0/DIST:.1f}y")
print(f"  Do-nothing loss:  -20% ${BETA_D_TOTAL*0.20:,.0f}  -30% ${BETA_D_TOTAL*0.30:,.0f}  -40% ${BETA_D_TOTAL*0.40:,.0f}")
print("-"*78)
hdr=f"  {'TaxBudget':>10}{'lots':>5}{'proceeds':>12}{'tax':>10}{'beta':>13}{'cash%':>7}{'runway':>7}"
print(hdr)
for t in tiers:
    print(f"  {t['budget']:>10,}{t['n_lots']:>5}{t['proceeds']:>12,.0f}{t['gross_tax']:>10,.0f}"
          f"   {t['beta_before']:.2f}->{t['beta_after']:.2f}{t['new_cash_pct']:>7.1f}{t['runway_years_after']:>7.1f}")
print("-"*78)
print("  Downside protection bought (loss avoided in each scenario):")
for t in tiers:
    p=t['drawdown_protection']
    print(f"   ${t['budget']:>7,} tax -> protects  -20% ${p['dd_20']:,.0f}   -30% ${p['dd_30']:,.0f}   -40% ${p['dd_40']:,.0f}")
print("="*78)

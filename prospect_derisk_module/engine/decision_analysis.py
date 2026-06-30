#!/usr/bin/env python3
"""
decision_analysis.py  — WS2 core risk-vs-tax decision analytic
Finesse Funds · Prospect Portfolio Calculator

For every tax lot, put three numbers side by side and find the breakeven:
  T  = tax to sell now, at TRUST MARGINAL rates (LT 28.2% / ST 45.2%)
       (marginal is correct: the trust is already realizing millions, so every
        additional gain dollar stacks at the top of the compressed brackets)
  L  = drawdown loss if HELD, beta-adjusted, at -20% / -30% / -40%
       L = market_value * stress_beta * drawdown
  BE = breakeven drawdown = T / (market_value * stress_beta)
       -> "how big a market drop makes the tax worth paying?"

Recommended de-risking set = lots whose breakeven drawdown is below the scenario
threshold (i.e. a correction of that size would lose MORE than the tax to exit).
Aggregates to position level and ranks by beta-dollars-removed per tax-dollar.
Outputs decision_analysis.json.
"""
import json
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).parent

# ---- TRUST MARGINAL RATES (above ~$15,950 threshold; verify w/ CPA) ----
LT_FED, ST_FED = 0.20, 0.37
NIIT, STATE = 0.038, 0.044
LT_RATE = LT_FED + NIIT + STATE     # 0.282
ST_RATE = ST_FED + NIIT + STATE     # 0.452
DRAWDOWNS = [0.20, 0.30, 0.40]
REF_DD = 0.30                        # reference scenario for ranking

lots = json.load(open(BASE / "tax_analysis.json"))["lots_detail"]
corr = json.load(open(BASE / "corrected_portfolio.json"))
stress_beta = {p["ticker"]: p.get("stress_beta", 1.0) for p in corr["positions"]}
raw_beta    = {p["ticker"]: p.get("raw_beta", None)   for p in corr["positions"]}

def marginal_tax(gain, is_lt):
    """Marginal trust tax on a gain (losses return a negative = tax benefit)."""
    return gain * (LT_RATE if is_lt else ST_RATE)

lot_rows = []
for l in lots:
    tk = l["ticker"]
    mv = l["market_value"]
    gl = l["unrealized_gl"]
    is_lt = l["holding_period"] == "LT"
    beta = stress_beta.get(tk, 1.0)
    T = round(marginal_tax(gl, is_lt), 2)
    dd_loss = {f"dd_{int(x*100)}": round(mv * beta * x, 2) for x in DRAWDOWNS}
    risk_dollars = mv * beta
    be = round(T / risk_dollars, 4) if risk_dollars > 0 else None   # breakeven drawdown (fraction)
    prot_ratio = round((mv * beta * REF_DD) / T, 2) if T > 0 else None  # protected $ per tax $ at -30%
    lot_rows.append({
        "ticker": tk, "name": l["name"], "section": l["section"],
        "trade_date": l["trade_date"], "holding_period": l["holding_period"],
        "quantity": l["quantity"], "market_value": mv, "cost": l["total_cost"],
        "unrealized_gl": gl, "unrealized_gl_pct": l["unrealized_gl_pct"],
        "stress_beta": beta,
        "tax_to_sell_marginal": T,
        **dd_loss,
        "breakeven_drawdown_pct": round(be*100, 2) if be is not None else None,
        "protect_per_tax_dollar_at_30": prot_ratio,
    })

# ---- position-level aggregation ----
pos = defaultdict(lambda: {"mv":0.0,"gl":0.0,"tax":0.0,"dd":{f"dd_{int(x*100)}":0.0 for x in DRAWDOWNS},"name":"","section":"","beta":0.0})
for r in lot_rows:
    p = pos[r["ticker"]]
    p["name"]=r["name"]; p["section"]=r["section"]; p["beta"]=r["stress_beta"]
    p["mv"]+=r["market_value"]; p["gl"]+=r["unrealized_gl"]; p["tax"]+=r["tax_to_sell_marginal"]
    for x in DRAWDOWNS: p["dd"][f"dd_{int(x*100)}"]+=r[f"dd_{int(x*100)}"]

pos_rows=[]
for tk,p in pos.items():
    risk_d = p["mv"]*p["beta"]
    be = (p["tax"]/risk_d) if risk_d>0 else None
    pos_rows.append({
        "ticker":tk,"name":p["name"],"section":p["section"],
        "market_value":round(p["mv"],2),"unrealized_gl":round(p["gl"],2),
        "stress_beta":p["beta"],
        "tax_to_exit":round(p["tax"],2),
        "dd_20":round(p["dd"]["dd_20"],2),"dd_30":round(p["dd"]["dd_30"],2),"dd_40":round(p["dd"]["dd_40"],2),
        "breakeven_drawdown_pct":round(be*100,2) if be is not None else None,
        "beta_dollars":round(risk_d,2),
        "beta_dollars_per_tax_dollar":round(risk_d/p["tax"],2) if p["tax"]>0 else None,
    })

# ---- recommended de-risk set: lots whose breakeven < scenario threshold ----
def sell_set(threshold_pct):
    sel=[r for r in lot_rows if (r["breakeven_drawdown_pct"] is not None and r["breakeven_drawdown_pct"] < threshold_pct)
         or r["tax_to_sell_marginal"]<=0]
    mv=sum(r["market_value"] for r in sel)
    tax=sum(max(r["tax_to_sell_marginal"],0) for r in sel)  # losses don't add tax
    tax_net=sum(r["tax_to_sell_marginal"] for r in sel)     # net incl loss benefit
    beta_d=sum(r["market_value"]*r["stress_beta"] for r in sel)
    prot={f"dd_{int(x*100)}":round(sum(r[f"dd_{int(x*100)}"] for r in sel),2) for x in DRAWDOWNS}
    return {"threshold_pct":threshold_pct,"n_lots":len(sel),"proceeds_mv":round(mv,2),
            "gross_tax":round(tax,2),"net_tax_incl_harvest":round(tax_net,2),
            "beta_dollars_removed":round(beta_d,2),"drawdown_protection":prot}

sets={f"corr_{int(x*100)}":sell_set(x*100) for x in DRAWDOWNS}

# ---- portfolio aggregate drawdown (hold everything) ----
total_mv = corr["summary"]["grand_total_current"]
sec_dd={f"dd_{int(x*100)}":round(sum(r[f'dd_{int(x*100)}'] for r in lot_rows),2) for x in DRAWDOWNS}

out={
 "method":{
   "tax":"trust marginal LT 28.2% / ST 45.2% (20/37% fed + 3.8% NIIT + 4.4% state)",
   "drawdown":"L = market_value * stress_beta * drawdown; stress betas Blume-adjusted, floored 0.35",
   "breakeven":"BE% = tax_to_sell / (market_value * stress_beta)",
   "sell_rule":"recommend lots with breakeven drawdown below the scenario threshold (or loss lots)",
 },
 "portfolio":{
   "total_mv":total_mv,
   "cash_mv":corr["summary"]["cash_mv"],
   "full_exit_tax_marginal":round(sum(max(r['tax_to_sell_marginal'],0) for r in lot_rows),2),
   "hold_all_drawdown_loss":sec_dd,
 },
 "recommended_sets":sets,
 "position_ranking":sorted(pos_rows,key=lambda x:(x["beta_dollars_per_tax_dollar"] is None, -(x["beta_dollars_per_tax_dollar"] or 0))),
 "lots":lot_rows,
}
json.dump(out,open(BASE/"decision_analysis.json","w"),indent=1)

# ---- report ----
print("="*72)
print("  RISK-vs-TAX DECISION ANALYTIC")
print("="*72)
print(f"  Portfolio total: ${total_mv:,.0f}   Cash: ${out['portfolio']['cash_mv']:,.0f}")
print(f"  Full-exit tax (marginal): ${out['portfolio']['full_exit_tax_marginal']:,.0f}")
print(f"  HOLD-ALL drawdown loss:  -20% ${sec_dd['dd_20']:,.0f}   -30% ${sec_dd['dd_30']:,.0f}   -40% ${sec_dd['dd_40']:,.0f}")
print("-"*72)
print("  RECOMMENDED DE-RISK SET (sell lots whose breakeven < scenario):")
for k,s in sets.items():
    print(f"   @{s['threshold_pct']:.0f}% scenario: {s['n_lots']} lots | raise ${s['proceeds_mv']:,.0f} | "
          f"tax ${s['gross_tax']:,.0f} | removes ${s['beta_dollars_removed']:,.0f} beta-$ | "
          f"protects ${s['drawdown_protection']['dd_'+str(int(s['threshold_pct']))]:,.0f} at that scenario")
print("-"*72)
print("  TOP 12 SELL CANDIDATES (most risk removed per tax dollar):")
print(f"   {'TKR':6}{'MV':>12}{'beta':>6}{'tax_exit':>11}{'BE%':>7}{'$/tax$':>8}")
for r in out['position_ranking'][:12]:
    bd=r['beta_dollars_per_tax_dollar']
    print(f"   {r['ticker']:6}{r['market_value']:>12,.0f}{r['stress_beta']:>6.2f}{r['tax_to_exit']:>11,.0f}"
          f"{(r['breakeven_drawdown_pct'] or 0):>7.1f}{(bd or 0):>8.1f}")
print("="*72)

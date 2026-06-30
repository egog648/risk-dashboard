#!/usr/bin/env python3
"""
analyze_risk.py  — Module 3: Portfolio Risk Analyzer
Finesse Funds Investments · Prospect Portfolio Calculator

Computes portfolio risk metrics from enriched_portfolio.json:
  - Weighted beta, volatility, Sharpe ratio
  - Value at Risk (95% / 99%, parametric and historical)
  - Covariance / correlation matrix across positions
  - Concentration: top-N positions, sector weights
  - LT vs ST lot breakdown by position and portfolio

Usage:
    python analyze_risk.py [enriched_portfolio.json] [risk_analysis.json]

Requires:  pip install numpy
"""

import json, sys, math
from pathlib import Path
from datetime import datetime
from collections import defaultdict

try:
    import numpy as np
except ImportError:
    sys.exit("ERROR: pip install numpy")

SCRIPT_DIR   = Path(__file__).parent
RISK_FREE    = 0.0525   # approximate 2026 T-bill rate (update as needed)
TRADING_DAYS = 252


# ─── Helpers ─────────────────────────────────────────────────────────────────

def weighted_mean(values, weights):
    total_w = sum(weights)
    if total_w == 0:
        return None
    return sum(v * w for v, w in zip(values, weights)) / total_w


def portfolio_volatility(returns_matrix, weights):
    """
    True portfolio volatility using full covariance matrix.
    returns_matrix: list of equal-length daily-return lists, one per asset.
    weights: portfolio weights (must sum to 1, same order).
    Returns annualised vol.
    """
    if not returns_matrix:
        return None
    n = min(len(r) for r in returns_matrix)
    arr = np.array([r[-n:] for r in returns_matrix])   # shape: (assets, days)
    cov = np.cov(arr) * TRADING_DAYS                    # annualised cov matrix
    w   = np.array(weights)
    var = float(w @ cov @ w)
    return math.sqrt(var) if var >= 0 else None


def parametric_var(port_ret, port_vol, confidence=0.95):
    """Parametric (normal) VaR as a fraction of portfolio value."""
    from scipy.stats import norm
    z = norm.ppf(1 - confidence)
    return -(port_ret / TRADING_DAYS + z * port_vol / math.sqrt(TRADING_DAYS))


def historical_var(portfolio_daily_returns, confidence=0.95):
    """Historical simulation VaR (1-day, as fraction of portfolio value)."""
    if len(portfolio_daily_returns) < 20:
        return None
    s = sorted(portfolio_daily_returns)
    idx = int((1 - confidence) * len(s))
    return -s[idx]


def corr_matrix(returns_lists, tickers):
    """Return correlation matrix dict and numpy array."""
    n = min(len(r) for r in returns_lists)
    arr = np.array([r[-n:] for r in returns_lists])
    corr = np.corrcoef(arr)
    result = {}
    for i, ti in enumerate(tickers):
        result[ti] = {tickers[j]: round(float(corr[i, j]), 4) for j in range(len(tickers))}
    return result, corr


# ─── Main ────────────────────────────────────────────────────────────────────

def analyze(enriched_path, output_path):
    with open(enriched_path) as f:
        data = json.load(f)

    positions = data["positions"]
    total_mv  = sum(p.get("market_value") or 0 for p in positions
                    if p.get("section") != "MONEY_MARKET"
                    and not p.get("_market_data", {}).get("error"))

    if total_mv <= 0:
        sys.exit("ERROR: No valid market values found. Run fetch_market_data.py first.")

    # ── Filter to positions with price history ──────────────────────────────
    valid = [
        p for p in positions
        if (p.get("_market_data", {}).get("daily_returns") or [])
        and p.get("market_value", 0) > 0
        and p.get("section") != "MONEY_MARKET"
    ]
    print(f"  {len(valid)} positions with price history (of {len(positions)} total)")

    tickers  = [p["ticker"] for p in valid]
    mv_list  = [p["market_value"] for p in valid]
    weights  = [mv / total_mv for mv in mv_list]
    ret_lists= [p["_market_data"]["daily_returns"] for p in valid]

    # ── Per-position metrics ────────────────────────────────────────────────
    position_metrics = []
    for p, w in zip(valid, weights):
        md   = p.get("_market_data", {})
        beta = md.get("beta")
        vol  = md.get("annual_volatility")
        ret  = md.get("annual_return_1y")
        mv   = p.get("market_value", 0)
        cost = p.get("total_cost") or 0
        unreal = p.get("unrealized_gl")

        sharpe = None
        if ret is not None and vol and vol > 0:
            sharpe = round((ret - RISK_FREE) / vol, 4)

        position_metrics.append({
            "ticker":              p["ticker"],
            "name":                p.get("name", ""),
            "section":             p.get("section", ""),
            "market_value":        mv,
            "weight_pct":          round(w * 100, 4),
            "beta":                beta,
            "annual_volatility":   vol,
            "annual_return_1y":    ret,
            "sharpe_ratio":        sharpe,
            "unrealized_gl":       unreal,
            "unrealized_gl_pct":   round(unreal / cost * 100, 2) if cost and unreal else None,
        })

    # Sort by weight descending
    position_metrics.sort(key=lambda x: x["weight_pct"], reverse=True)

    # ── Portfolio-level risk ────────────────────────────────────────────────
    betas   = [(p["beta"], w) for p, w in zip(valid, weights) if p.get("_market_data", {}).get("beta") is not None]
    vols    = [(p.get("_market_data", {}).get("annual_volatility"), w)
               for p, w in zip(valid, weights) if p.get("_market_data", {}).get("annual_volatility")]
    rets    = [(p.get("_market_data", {}).get("annual_return_1y"), w)
               for p, w in zip(valid, weights) if p.get("_market_data", {}).get("annual_return_1y")]

    w_beta  = weighted_mean([b for b, _ in betas], [w for _, w in betas])
    w_vol_s = weighted_mean([v for v, _ in vols],  [w for _, w in vols])   # simple weighted
    w_ret   = weighted_mean([r for r, _ in rets],  [w for _, w in rets])

    # True portfolio vol (covariance-matrix)
    true_port_vol = portfolio_volatility(ret_lists, weights)

    # Portfolio Sharpe
    port_sharpe = None
    if w_ret is not None and true_port_vol and true_port_vol > 0:
        port_sharpe = round((w_ret - RISK_FREE) / true_port_vol, 4)

    # ── Portfolio daily returns (weighted sum) ──────────────────────────────
    n_days = min(len(r) for r in ret_lists)
    port_daily = [
        sum(ret_lists[i][-(n_days - d)] * weights[i] for i in range(len(valid)))
        for d in range(n_days)
    ]

    # VaR
    var_95_param = None
    var_99_param = None
    var_95_hist  = historical_var(port_daily, 0.95)
    var_99_hist  = historical_var(port_daily, 0.99)
    try:
        var_95_param = parametric_var(w_ret or 0, true_port_vol or 0, 0.95)
        var_99_param = parametric_var(w_ret or 0, true_port_vol or 0, 0.99)
    except Exception:
        pass

    # CVaR (Expected Shortfall) — average loss beyond VaR
    cvar_95 = None
    cvar_99 = None
    if var_95_hist is not None:
        tail_95 = sorted(r for r in port_daily if r < -var_95_hist)
        if tail_95: cvar_95 = round(-sum(tail_95) / len(tail_95), 6)
    if var_99_hist is not None:
        tail_99 = sorted(r for r in port_daily if r < -var_99_hist)
        if tail_99: cvar_99 = round(-sum(tail_99) / len(tail_99), 6)

    # ── Sector / asset-class concentration ─────────────────────────────────
    sector_mv = defaultdict(float)
    for p, w in zip(valid, weights):
        sector_mv[p.get("section", "UNKNOWN")] += p.get("market_value", 0)
    sector_weights = {
        sec: {"market_value": round(mv, 2),
              "weight_pct": round(mv / total_mv * 100, 2)}
        for sec, mv in sorted(sector_mv.items(), key=lambda x: -x[1])
    }

    # ── Herfindahl-Hirschman concentration index ────────────────────────────
    hhi = sum(w ** 2 for w in weights) * 10000  # 0–10,000; >2500 = highly concentrated

    # ── LT vs ST breakdown ─────────────────────────────────────────────────
    lt_cost = st_cost = lt_mv = st_mv = lt_unreal = st_unreal = 0.0
    for p in positions:
        if p.get("section") == "MONEY_MARKET":
            continue
        for lot in p.get("lots", []):
            hp   = lot.get("holding_period", "LT")
            qty  = lot.get("quantity") or 0
            uc   = lot.get("unit_cost") or 0
            tc   = lot.get("total_cost") or qty * uc
            cur  = p.get("current_price") or 0
            lmv  = qty * cur
            unrl = lmv - tc

            if hp == "LT":
                lt_cost += tc; lt_mv += lmv; lt_unreal += unrl
            else:
                st_cost += tc; st_mv += lmv; st_unreal += unrl

    lt_st_breakdown = {
        "long_term":  {"total_cost": round(lt_cost, 2), "market_value": round(lt_mv, 2),
                       "unrealized_gl": round(lt_unreal, 2)},
        "short_term": {"total_cost": round(st_cost, 2), "market_value": round(st_mv, 2),
                       "unrealized_gl": round(st_unreal, 2)},
    }

    # ── Correlation matrix (top 20 by weight) ──────────────────────────────
    top20_idx   = sorted(range(len(valid)), key=lambda i: weights[i], reverse=True)[:20]
    top20_tick  = [tickers[i] for i in top20_idx]
    top20_ret   = [ret_lists[i] for i in top20_idx]
    corr_dict, _= corr_matrix(top20_ret, top20_tick)

    # ── Assemble output ─────────────────────────────────────────────────────
    result = {
        "analyzed_at": datetime.now().isoformat(),
        "total_portfolio_mv": round(total_mv, 2),
        "position_count": len(valid),
        "risk_free_rate": RISK_FREE,

        "portfolio_risk": {
            "weighted_beta":           round(w_beta, 4) if w_beta else None,
            "weighted_vol_simple":     round(w_vol_s, 4) if w_vol_s else None,
            "portfolio_vol_covariance":round(true_port_vol, 4) if true_port_vol else None,
            "weighted_annual_return":  round(w_ret, 4) if w_ret else None,
            "portfolio_sharpe":        port_sharpe,
            "hhi_concentration":       round(hhi, 1),
            "var_95_historical_1d_pct":round(var_95_hist * 100, 4) if var_95_hist else None,
            "var_99_historical_1d_pct":round(var_99_hist * 100, 4) if var_99_hist else None,
            "var_95_parametric_1d_pct":round(var_95_param * 100, 4) if var_95_param else None,
            "var_99_parametric_1d_pct":round(var_99_param * 100, 4) if var_99_param else None,
            "cvar_95_1d_pct":          round(cvar_95 * 100, 4) if cvar_95 else None,
            "cvar_99_1d_pct":          round(cvar_99 * 100, 4) if cvar_99 else None,
        },

        "sector_weights":     sector_weights,
        "lt_st_breakdown":    lt_st_breakdown,
        "position_metrics":   position_metrics,
        "correlation_matrix": corr_dict,   # top-20 positions
        "portfolio_daily_returns": port_daily,
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, default=str)

    # ── Print summary ───────────────────────────────────────────────────────
    pr = result["portfolio_risk"]
    print(f"\n{'='*55}")
    print(f"  Portfolio MV:          ${total_mv:>14,.2f}")
    print(f"  Weighted Beta:         {pr['weighted_beta']}")
    print(f"  Portfolio Vol (cov):   {pr['portfolio_vol_covariance']}")
    print(f"  Weighted Return (1Y):  {pr['weighted_annual_return']}")
    print(f"  Portfolio Sharpe:      {pr['portfolio_sharpe']}")
    print(f"  HHI Concentration:     {pr['hhi_concentration']} / 10,000")
    print(f"  VaR 95% (1-day):       {pr['var_95_historical_1d_pct']}%")
    print(f"  VaR 99% (1-day):       {pr['var_99_historical_1d_pct']}%")
    print(f"\n  Sector Breakdown:")
    for sec, sw in sector_weights.items():
        print(f"    {sec:<22} {sw['weight_pct']:>6.1f}%   ${sw['market_value']:>12,.0f}")
    print(f"\n  LT Unrealized G/L:  ${lt_unreal:>12,.0f}")
    print(f"  ST Unrealized G/L:  ${st_unreal:>12,.0f}")
    print(f"{'='*55}")
    print(f"  Output: {output_path}")

    return result


def main():
    base   = SCRIPT_DIR
    inp    = Path(sys.argv[1]) if len(sys.argv) > 1 else base / "enriched_portfolio.json"
    out    = Path(sys.argv[2]) if len(sys.argv) > 2 else base / "risk_analysis.json"
    print(f"Input:  {inp}")
    analyze(inp, out)


if __name__ == "__main__":
    main()

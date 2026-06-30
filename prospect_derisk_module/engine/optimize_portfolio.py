#!/usr/bin/env python3
"""
optimize_portfolio.py  — Module 4: Efficient Frontier Optimizer
Finesse Funds Investments · Prospect Portfolio Calculator

Runs unconstrained Markowitz mean-variance optimization on the portfolio.
Outputs:
  - Current portfolio risk/return point
  - Minimum-variance portfolio weights
  - Maximum-Sharpe-ratio (tangency) portfolio weights
  - 500-point efficient frontier curve
  - Suggested reallocation vs current weights

Usage:
    python optimize_portfolio.py [enriched_portfolio.json] [optimization_results.json]

Requires:  pip install numpy scipy
"""

import json, sys, math
from pathlib import Path
from datetime import datetime

try:
    import numpy as np
    from scipy.optimize import minimize
except ImportError:
    sys.exit("ERROR: pip install numpy scipy")

SCRIPT_DIR   = Path(__file__).parent
RISK_FREE    = 0.0525
TRADING_DAYS = 252
N_FRONTIER   = 500    # points on the efficient frontier curve


# ─── Core optimizer ───────────────────────────────────────────────────────────

def build_inputs(valid_positions, total_mv):
    """
    Returns (mu, cov, weights_current, tickers) from enriched position list.
    mu  — annualised expected return vector (uses 1-year historical)
    cov — annualised covariance matrix
    """
    tickers  = [p["ticker"] for p in valid_positions]
    ret_lists= [p["_market_data"]["daily_returns"] for p in valid_positions]
    n_days   = min(len(r) for r in ret_lists)
    arr      = np.array([r[-n_days:] for r in ret_lists])   # (assets, days)

    mu  = arr.mean(axis=1) * TRADING_DAYS                   # annualised mean return
    cov = np.cov(arr) * TRADING_DAYS                        # annualised cov matrix

    mv_list         = [p.get("market_value", 0) for p in valid_positions]
    weights_current = np.array(mv_list) / sum(mv_list)

    return mu, cov, weights_current, tickers


def portfolio_stats(w, mu, cov):
    ret = float(w @ mu)
    vol = float(math.sqrt(w @ cov @ w))
    sharpe = (ret - RISK_FREE) / vol if vol > 0 else 0
    return ret, vol, sharpe


def min_variance(mu, cov):
    n = len(mu)
    w0 = np.ones(n) / n
    constraints = [{"type": "eq", "fun": lambda w: w.sum() - 1}]
    bounds = [(0, 1)] * n   # long-only (no shorting) — change to (None,None) to allow shorts
    res = minimize(lambda w: w @ cov @ w,
                   w0, method="SLSQP",
                   bounds=bounds,
                   constraints=constraints,
                   options={"ftol": 1e-12, "maxiter": 1000})
    return res.x if res.success else w0


def max_sharpe(mu, cov):
    n = len(mu)
    w0 = np.ones(n) / n

    def neg_sharpe(w):
        r, v, _ = portfolio_stats(w, mu, cov)
        return -((r - RISK_FREE) / v) if v > 0 else 0

    constraints = [{"type": "eq", "fun": lambda w: w.sum() - 1}]
    bounds = [(0, 1)] * n
    res = minimize(neg_sharpe, w0, method="SLSQP",
                   bounds=bounds,
                   constraints=constraints,
                   options={"ftol": 1e-12, "maxiter": 1000})
    return res.x if res.success else w0


def efficient_frontier(mu, cov, n_points=N_FRONTIER):
    """
    Trace the efficient frontier by solving min-variance for each target return
    between the min-var return and the max possible return.
    """
    w_mv  = min_variance(mu, cov)
    r_min, _, _ = portfolio_stats(w_mv, mu, cov)
    r_max = float(mu.max())
    target_returns = np.linspace(r_min, r_max * 0.99, n_points)

    frontier = []
    n = len(mu)
    w0 = w_mv.copy()

    for r_target in target_returns:
        constraints = [
            {"type": "eq", "fun": lambda w: w.sum() - 1},
            {"type": "eq", "fun": lambda w, rt=r_target: w @ mu - rt},
        ]
        bounds = [(0, 1)] * n
        res = minimize(lambda w: w @ cov @ w,
                       w0, method="SLSQP",
                       bounds=bounds,
                       constraints=constraints,
                       options={"ftol": 1e-12, "maxiter": 500})
        if res.success:
            r, v, s = portfolio_stats(res.x, mu, cov)
            frontier.append({
                "return":  round(r, 6),
                "vol":     round(v, 6),
                "sharpe":  round(s, 4),
                "weights": {t: round(float(w), 6)
                            for t, w in zip(
                                [p["ticker"] for p in []],  # filled below
                                res.x)},
            })
            w0 = res.x  # warm start

    return frontier


def efficient_frontier_with_tickers(mu, cov, tickers, n_points=N_FRONTIER):
    """Efficient frontier with tickers embedded in weight dicts."""
    w_mv  = min_variance(mu, cov)
    r_min, _, _ = portfolio_stats(w_mv, mu, cov)
    r_max = float(mu.max())
    targets = np.linspace(r_min, r_max * 0.99, n_points)

    frontier = []
    n  = len(mu)
    w0 = w_mv.copy()

    for rt in targets:
        constraints = [
            {"type": "eq", "fun": lambda w: w.sum() - 1},
            {"type": "eq", "fun": lambda w, r=rt: w @ mu - r},
        ]
        res = minimize(lambda w: w @ cov @ w, w0,
                       method="SLSQP", bounds=[(0,1)]*n,
                       constraints=constraints,
                       options={"ftol": 1e-12, "maxiter": 500})
        if res.success:
            r, v, s = portfolio_stats(res.x, mu, cov)
            frontier.append({"return": round(r,6), "vol": round(v,6), "sharpe": round(s,4)})
            w0 = res.x

    return frontier


def reallocation_table(tickers, w_current, w_target, total_mv):
    rows = []
    for t, wc, wt in zip(tickers, w_current, w_target):
        delta_w  = wt - wc
        delta_mv = delta_w * total_mv
        rows.append({
            "ticker":          t,
            "current_weight":  round(float(wc) * 100, 2),
            "target_weight":   round(float(wt) * 100, 2),
            "delta_weight_pct":round(float(delta_w) * 100, 2),
            "delta_mv":        round(delta_mv, 2),
            "action":          "BUY" if delta_mv > 1000 else "SELL" if delta_mv < -1000 else "HOLD",
        })
    rows.sort(key=lambda x: x["delta_mv"])
    return rows


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    base = SCRIPT_DIR
    inp  = Path(sys.argv[1]) if len(sys.argv) > 1 else base / "enriched_portfolio.json"
    out  = Path(sys.argv[2]) if len(sys.argv) > 2 else base / "optimization_results.json"

    with open(inp) as f:
        data = json.load(f)

    positions = data["positions"]
    valid = [
        p for p in positions
        if (p.get("_market_data", {}).get("daily_returns") or [])
        and p.get("market_value", 0) > 0
        and p.get("section") not in ("MONEY_MARKET", "FIXED_INCOME")
        and not p.get("_market_data", {}).get("error")
    ]
    total_mv = sum(p["market_value"] for p in valid)
    print(f"  Optimizing {len(valid)} positions, total MV ${total_mv:,.0f}")

    mu, cov, w_cur, tickers = build_inputs(valid, total_mv)

    # Current portfolio stats
    r_cur, v_cur, s_cur = portfolio_stats(w_cur, mu, cov)

    # Min-variance portfolio
    w_mv  = min_variance(mu, cov)
    r_mv, v_mv, s_mv = portfolio_stats(w_mv, mu, cov)
    print(f"  Min-variance:   ret={r_mv:.2%}  vol={v_mv:.2%}  Sharpe={s_mv:.3f}")

    # Max-Sharpe (tangency) portfolio
    w_ms  = max_sharpe(mu, cov)
    r_ms, v_ms, s_ms = portfolio_stats(w_ms, mu, cov)
    print(f"  Max-Sharpe:     ret={r_ms:.2%}  vol={v_ms:.2%}  Sharpe={s_ms:.3f}")

    # Current
    print(f"  Current:        ret={r_cur:.2%}  vol={v_cur:.2%}  Sharpe={s_cur:.3f}")

    # Efficient frontier
    print(f"  Tracing frontier ({N_FRONTIER} points)…")
    frontier = efficient_frontier_with_tickers(mu, cov, tickers, N_FRONTIER)

    # Reallocation tables
    realloc_mv  = reallocation_table(tickers, w_cur, w_mv,  total_mv)
    realloc_ms  = reallocation_table(tickers, w_cur, w_ms,  total_mv)

    def w_dict(w):
        return {t: round(float(v), 6) for t, v in zip(tickers, w)}

    result = {
        "optimized_at": datetime.now().isoformat(),
        "total_mv":     round(total_mv, 2),
        "risk_free":    RISK_FREE,
        "n_assets":     len(valid),

        "current_portfolio": {
            "annual_return": round(r_cur, 6),
            "annual_vol":    round(v_cur, 6),
            "sharpe":        round(s_cur, 4),
            "weights":       w_dict(w_cur),
        },
        "min_variance_portfolio": {
            "annual_return": round(r_mv, 6),
            "annual_vol":    round(v_mv, 6),
            "sharpe":        round(s_mv, 4),
            "weights":       w_dict(w_mv),
            "reallocation":  realloc_mv,
        },
        "max_sharpe_portfolio": {
            "annual_return": round(r_ms, 6),
            "annual_vol":    round(v_ms, 6),
            "sharpe":        round(s_ms, 4),
            "weights":       w_dict(w_ms),
            "reallocation":  realloc_ms,
        },
        "efficient_frontier": frontier,
        "expected_returns":   {t: round(float(m), 6) for t, m in zip(tickers, mu)},
        "annual_volatilities":{t: round(float(math.sqrt(cov[i,i])), 6)
                               for i, t in enumerate(tickers)},
    }

    with open(out, "w") as f:
        json.dump(result, f, indent=2)

    # Summary
    print(f"\n{'='*55}")
    print(f"  Sharpe improvement (current → max-Sharpe):  "
          f"{s_cur:.3f} → {s_ms:.3f}  (+{s_ms-s_cur:.3f})")
    print(f"  Vol reduction (current → min-var):          "
          f"{v_cur:.2%} → {v_mv:.2%}")
    print(f"\n  Top 10 max-Sharpe weights:")
    top10 = sorted(w_dict(w_ms).items(), key=lambda x: -x[1])[:10]
    for t, w in top10:
        print(f"    {t:<8}  {w*100:>6.2f}%")
    print(f"{'='*55}")
    print(f"  Output: {out}")


if __name__ == "__main__":
    main()

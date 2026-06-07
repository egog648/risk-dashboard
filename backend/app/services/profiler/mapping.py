"""Map stored profile scores to portfolio outline data."""
import json

from app.models.db_models import ClientProfile


def compute_sleeve_allocation(
    g_pct: float, i_pct: float, s_pct: float, agg: float
) -> dict[str, float]:
    alt_from_equity = round(g_pct * min((agg - 0.5) * 0.4, 0.15)) if agg > 0.5 else 0
    alt_from_income = round(i_pct * min((agg - 0.4) * 0.3, 0.10)) if agg > 0.4 else 0
    total_alts = alt_from_equity + alt_from_income
    return {
        "stocks": g_pct - alt_from_equity,
        "bonds": i_pct - alt_from_income,
        "alts": total_alts,
        "cash": s_pct,
    }


def map_scores_to_weights(
    g_pct: float,
    i_pct: float,
    s_pct: float,
    gov_agg_pct: float,
    cap: float,
) -> dict[str, float]:
    agg = gov_agg_pct / 100
    sleeve = compute_sleeve_allocation(g_pct, i_pct, s_pct, agg)
    stocks, bonds, alts, cash = (
        sleeve["stocks"],
        sleeve["bonds"],
        sleeve["alts"],
        sleeve["cash"],
    )

    cash_floor = 0.05
    if cap <= 30:
        cash_floor = 0.2
    elif cap <= 60:
        cash_floor = 0.12

    cash_pct = max(cash, round(cash_floor * 100))
    remaining = 100 - cash_pct
    sleeve_total = stocks + bonds + alts or 1
    scaled_stocks = (stocks / sleeve_total) * remaining
    scaled_bonds = (bonds / sleeve_total) * remaining
    scaled_alts = (alts / sleeve_total) * remaining

    large_pct = 0.35 if agg > 0.6 else 0.55 if agg > 0.3 else 0.7
    mid_pct = 0.3 if agg > 0.6 else 0.25 if agg > 0.3 else 0.2
    small_pct = 1 - large_pct - mid_pct
    gov_pct = 0.25 if agg > 0.6 else 0.45 if agg > 0.3 else 0.6
    ig_pct = 0.35 if agg > 0.6 else 0.45 if agg > 0.3 else 0.35
    hy_pct = 1 - gov_pct - ig_pct
    reits_pct = 0.5
    gold_pct = 0.3 if agg > 0.6 else 0.4
    comm_pct = 1 - reits_pct - gold_pct

    weights = {
        "equities_large": (scaled_stocks * large_pct) / 100,
        "equities_mid": (scaled_stocks * mid_pct) / 100,
        "equities_small": (scaled_stocks * small_pct) / 100,
        "credit_government": (scaled_bonds * gov_pct) / 100,
        "credit_corporate_ig": (scaled_bonds * ig_pct) / 100,
        "credit_corporate_hy": (scaled_bonds * hy_pct) / 100,
        "hard_assets_reits": (scaled_alts * reits_pct) / 100,
        "hard_assets_gold": (scaled_alts * gold_pct) / 100,
        "hard_assets_commodities": (scaled_alts * comm_pct) / 100,
        "cash": cash_pct / 100,
    }
    total = sum(weights.values())
    if total > 0:
        weights = {k: v / total for k, v in weights.items()}
    return weights


def _build_vehicles(sleeve: dict[str, float], agg: float) -> dict[str, list[dict]]:
    stocks = sleeve["stocks"]
    bonds = sleeve["bonds"]
    alts = sleeve["alts"]
    cash = sleeve["cash"]
    vehicles: dict[str, list[dict]] = {}

    if stocks > 0:
        if agg <= 0.3:
            vehicles["equity"] = [
                {"name": "US Total Market Index (VTI / ITOT)", "pct": round(stocks * 0.65)},
                {"name": "International Developed (VXUS / IXUS)", "pct": round(stocks * 0.25)},
                {
                    "name": "Dividend Appreciation (VIG / DGRO)",
                    "pct": stocks - round(stocks * 0.65) - round(stocks * 0.25),
                },
            ]
        elif agg <= 0.6:
            vehicles["equity"] = [
                {"name": "US Total Market / S&P 500 Index", "pct": round(stocks * 0.45)},
                {"name": "International Blend (Developed + EM)", "pct": round(stocks * 0.2)},
                {"name": "Factor-Tilted / Smart Beta ETFs", "pct": round(stocks * 0.2)},
                {
                    "name": "Sector / Thematic ETFs",
                    "pct": stocks - round(stocks * 0.45) - round(stocks * 0.2) - round(stocks * 0.2),
                },
            ]
        else:
            vehicles["equity"] = [
                {"name": "US Core Index (S&P 500 / Total Market)", "pct": round(stocks * 0.3)},
                {"name": "Individual Stock Positions", "pct": round(stocks * 0.3)},
                {"name": "Sector / Thematic ETFs (Tech, Healthcare, etc.)", "pct": round(stocks * 0.2)},
                {
                    "name": "Small-Cap / Emerging Markets",
                    "pct": stocks - round(stocks * 0.3) - round(stocks * 0.3) - round(stocks * 0.2),
                },
            ]

    if bonds > 0:
        if agg <= 0.3:
            vehicles["bonds"] = [
                {"name": "US Treasury / Govt Bond Fund (VGSH / SHY)", "pct": round(bonds * 0.5)},
                {"name": "Investment-Grade Corporate (LQD / VCIT)", "pct": round(bonds * 0.3)},
                {"name": "Municipal Bonds (MUB / VTEB)", "pct": bonds - round(bonds * 0.5) - round(bonds * 0.3)},
            ]
        elif agg <= 0.6:
            vehicles["bonds"] = [
                {"name": "Aggregate Bond Index (AGG / BND)", "pct": round(bonds * 0.4)},
                {"name": "Corporate Bonds (LQD / VCIT)", "pct": round(bonds * 0.35)},
                {"name": "TIPS / Inflation Protected (TIP)", "pct": bonds - round(bonds * 0.4) - round(bonds * 0.35)},
            ]
        else:
            vehicles["bonds"] = [
                {"name": "High-Yield Corporate (HYG / JNK)", "pct": round(bonds * 0.4)},
                {"name": "Floating Rate / Bank Loans (BKLN)", "pct": round(bonds * 0.3)},
                {"name": "Short-Duration Investment Grade", "pct": bonds - round(bonds * 0.4) - round(bonds * 0.3)},
            ]

    if alts > 0:
        alt_list = [{"name": "REITs (VNQ / SCHH)", "pct": round(alts * 0.5)}]
        if agg > 0.6:
            alt_list.extend([
                {"name": "Commodities / Gold (GLD / IAU)", "pct": round(alts * 0.3)},
                {
                    "name": "Convertible Bonds / Preferred (CWB / PFF)",
                    "pct": alts - round(alts * 0.5) - round(alts * 0.3),
                },
            ])
        else:
            alt_list.append({"name": "Commodities / Gold (GLD / IAU)", "pct": alts - round(alts * 0.5)})
        vehicles["alternatives"] = alt_list

    if cash > 0:
        vehicles["cash"] = [
            {"name": "Money Market Fund (VMFXX / SPAXX)", "pct": round(cash * 0.7)},
            {"name": "Short-Term T-Bills (BIL / SGOV)", "pct": cash - round(cash * 0.7)},
        ]

    return vehicles


def build_outline_from_profile(profile: ClientProfile) -> dict:
    g_pct = profile.growth_pct
    i_pct = profile.income_pct
    s_pct = profile.safety_pct
    agg_pct = profile.governed_aggression_pct
    agg = agg_pct / 100

    sleeve = compute_sleeve_allocation(g_pct, i_pct, s_pct, agg)
    weights = map_scores_to_weights(
        g_pct, i_pct, s_pct, agg_pct, profile.governor_cap_pct
    )
    vehicles = _build_vehicles(sleeve, agg)

    narrative = (
        f"Portfolio outline generated from {profile.profile_label} profile "
        f"with {profile.risk_label} risk posture ({agg_pct}% aggression). "
    )
    if g_pct >= 50:
        narrative += "Equity sleeve weighted toward long-term capital appreciation. "
    elif i_pct >= 40:
        narrative += "Fixed income sleeve emphasizes yield-producing instruments. "
    elif s_pct >= 40:
        narrative += "Capital preservation prioritized with elevated cash allocation. "
    else:
        narrative += "Balanced diversification across growth, income, and safety. "

    if profile.governor_cap_pct < 100 and profile.raw_aggression_pct > profile.governed_aggression_pct:
        narrative += (
            f"Governor applied: stated risk {profile.raw_aggression_pct:.0f}% "
            f"capped to {profile.governed_aggression_pct:.0f}%."
        )

    return {
        "sleeve_allocation": sleeve,
        "weights": weights,
        "vehicles": vehicles,
        "narrative": narrative,
    }

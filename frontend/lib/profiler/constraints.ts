import type { ClientProfile } from "@/types/clients";
import type { OptimizationConstraintsPayload } from "@/types/portfolio";

export function minCashFromCap(governorCapPct: number): number {
  if (governorCapPct <= 30) return 0.2;
  if (governorCapPct <= 60) return 0.12;
  return 0.05;
}

export function maxVolFromCap(governorCapPct: number): number {
  return Math.round((0.06 + (governorCapPct / 100) * 0.14) * 10000) / 10000;
}

export function constraintsFromProfile(
  profile: ClientProfile
): OptimizationConstraintsPayload {
  return {
    min_cash: minCashFromCap(profile.governor_cap_pct),
    max_portfolio_vol: maxVolFromCap(profile.governor_cap_pct),
  };
}

export function formatConstraintSummary(
  constraints: OptimizationConstraintsPayload
): string {
  const parts: string[] = [];
  if (constraints.min_cash != null) {
    parts.push(`min ${Math.round(constraints.min_cash * 100)}% cash`);
  }
  if (constraints.max_portfolio_vol != null) {
    parts.push(`max ${(constraints.max_portfolio_vol * 100).toFixed(1)}% vol`);
  }
  return parts.join(", ");
}

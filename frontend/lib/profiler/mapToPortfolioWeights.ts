import type { PortfolioWeights } from "@/types/portfolio";
import type { ProfilerAnswers } from "./questions";
import { computeScores } from "./scoring";
import { computeSleeveAllocation } from "./report";

function normalizeWeights(weights: PortfolioWeights): PortfolioWeights {
  const keys = Object.keys(weights) as (keyof PortfolioWeights)[];
  const total = keys.reduce((sum, k) => sum + weights[k], 0);
  if (total <= 0) return weights;
  const normalized = { ...weights };
  keys.forEach((k) => {
    normalized[k] = weights[k] / total;
  });
  return normalized;
}

/**
 * Map profiler G/I/S triangle + governed aggression to 10-bucket PortfolioWeights.
 */
export function mapToPortfolioWeights(answers: ProfilerAnswers): PortfolioWeights {
  const sc = computeScores(answers);
  const gPct = Math.round(sc.g * 100);
  const iPct = Math.round(sc.i * 100);
  const sPct = Math.round(sc.s * 100);
  const agg = sc.govAgg / 100;

  const sleeve = computeSleeveAllocation(gPct, iPct, sPct, agg);
  const { stocks, bonds, alts, cash } = sleeve;

  // Governor cap raises minimum cash floor
  let cashFloor = 0.05;
  if (sc.cap <= 30) cashFloor = 0.2;
  else if (sc.cap <= 60) cashFloor = 0.12;

  const cashPct = Math.max(cash, Math.round(cashFloor * 100));
  const remaining = 100 - cashPct;

  // Scale stocks/bonds/alts to fit remaining
  const sleeveTotal = stocks + bonds + alts || 1;
  const scaledStocks = (stocks / sleeveTotal) * remaining;
  const scaledBonds = (bonds / sleeveTotal) * remaining;
  const scaledAlts = (alts / sleeveTotal) * remaining;

  // Equity sub-split based on aggression
  const largePct = agg > 0.6 ? 0.35 : agg > 0.3 ? 0.55 : 0.7;
  const midPct = agg > 0.6 ? 0.3 : agg > 0.3 ? 0.25 : 0.2;
  const smallPct = 1 - largePct - midPct;

  // Credit sub-split based on aggression
  const govPct = agg > 0.6 ? 0.25 : agg > 0.3 ? 0.45 : 0.6;
  const igPct = agg > 0.6 ? 0.35 : agg > 0.3 ? 0.45 : 0.35;
  const hyPct = 1 - govPct - igPct;

  // Hard assets from alternatives sleeve
  const reitsPct = 0.5;
  const goldPct = agg > 0.6 ? 0.3 : 0.4;
  const commPct = 1 - reitsPct - goldPct;

  const weights: PortfolioWeights = {
    equities_large: (scaledStocks * largePct) / 100,
    equities_mid: (scaledStocks * midPct) / 100,
    equities_small: (scaledStocks * smallPct) / 100,
    credit_government: (scaledBonds * govPct) / 100,
    credit_corporate_ig: (scaledBonds * igPct) / 100,
    credit_corporate_hy: (scaledBonds * hyPct) / 100,
    hard_assets_reits: (scaledAlts * reitsPct) / 100,
    hard_assets_gold: (scaledAlts * goldPct) / 100,
    hard_assets_commodities: (scaledAlts * commPct) / 100,
    cash: cashPct / 100,
  };

  return normalizeWeights(weights);
}

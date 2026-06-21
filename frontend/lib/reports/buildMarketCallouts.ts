import type { SleeveAllocation } from "@/lib/profiler/report";
import type {
  AssetClassMetrics,
  DataStatusResponse,
  YieldCurveResponse,
} from "@/types/assets";

export interface MarketCallout {
  id: string;
  severity: "info" | "warn";
  title: string;
  body: string;
}

export interface MarketCalloutContext {
  equities: AssetClassMetrics[];
  credit: AssetClassMetrics[];
  yieldCurve: YieldCurveResponse | null;
  dataStatus: DataStatusResponse | null;
}

const MAX_CALLOUTS = 3;

function findAsset(
  assets: AssetClassMetrics[],
  subClass: string
): AssetClassMetrics | undefined {
  return assets.find((a) => a.sub_class.toLowerCase() === subClass.toLowerCase());
}

function yieldForTenor(points: YieldCurveResponse["points"], tenor: string): number | null {
  const point = points.find((p) => p.tenor === tenor);
  return point?.yield_pct ?? null;
}

function calloutInvertedYieldCurve(
  ctx: MarketCalloutContext,
  sleeve: SleeveAllocation,
  safetyPct: number
): MarketCallout | null {
  if (sleeve.bonds <= 0 && safetyPct < 25) return null;
  const points = ctx.yieldCurve?.points;
  if (!points?.length) return null;

  const y2 = yieldForTenor(points, "2Y");
  const y10 = yieldForTenor(points, "10Y");
  if (y2 == null || y10 == null || y2 <= y10) return null;

  const spread = (y2 - y10).toFixed(2);
  return {
    id: "inverted-yield-curve",
    severity: "warn",
    title: "Inverted Yield Curve",
    body: `The 2-year Treasury (${y2.toFixed(2)}%) exceeds the 10-year (${y10.toFixed(2)}%) by ${spread} pp, signaling recession risk. Favor shorter-duration fixed income and maintain adequate cash reserves until the curve normalizes.`,
  };
}

function calloutElevatedSmallCap(
  ctx: MarketCalloutContext,
  sleeve: SleeveAllocation
): MarketCallout | null {
  if (sleeve.stocks <= 0) return null;

  const smallCap = findAsset(ctx.equities, "small_cap");
  const largeCap = findAsset(ctx.equities, "large_cap");
  if (!smallCap) return null;

  const smallScore = smallCap.risk_score;
  const largeScore = largeCap?.risk_score ?? 0;
  const elevated = smallScore >= 60 || smallScore - largeScore >= 20;
  if (!elevated) return null;

  return {
    id: "elevated-small-cap",
    severity: "warn",
    title: "Elevated Small-Cap Risk",
    body: `Small-cap risk score is ${Math.round(smallScore)}/100${largeCap ? ` (${Math.round(smallScore - largeScore)} pts above large cap)` : ""}. Consider underweighting small-cap exposure relative to the equity sleeve and favoring large-cap core holdings.`,
  };
}

function calloutWideHySpreads(
  ctx: MarketCalloutContext,
  sleeve: SleeveAllocation
): MarketCallout | null {
  if (sleeve.bonds <= 0) return null;

  const hy = findAsset(ctx.credit, "corporate_hy");
  const ig = findAsset(ctx.credit, "corporate_ig");
  if (!hy) return null;

  const hyVal = hy.metrics.valuation_score ?? 0;
  const hyRisk = hy.risk_score;
  const igRisk = ig?.risk_score ?? 0;
  const wideSpreads = hyVal > 1.5 || hyRisk - igRisk >= 15;
  if (!wideSpreads) return null;

  const valNote =
    hyVal > 1.5
      ? ` HY spreads are ${hyVal.toFixed(1)}σ above their historical median.`
      : "";

  return {
    id: "wide-hy-spreads",
    severity: "info",
    title: "Wide High-Yield Spreads",
    body: `High-yield credit risk score is ${Math.round(hyRisk)}/100 vs investment-grade at ${Math.round(igRisk)}/100.${valNote} Favor investment-grade corporates over high-yield for the fixed income sleeve.`,
  };
}

function calloutCreditContraction(
  ctx: MarketCalloutContext,
  sleeve: SleeveAllocation
): MarketCallout | null {
  if (sleeve.bonds <= 0) return null;

  const hy = findAsset(ctx.credit, "corporate_hy");
  const ig = findAsset(ctx.credit, "corporate_ig");
  const contracting =
    hy?.cycle_phase === "contraction" || ig?.cycle_phase === "contraction";
  if (!contracting) return null;

  const segment =
    hy?.cycle_phase === "contraction" && ig?.cycle_phase === "contraction"
      ? "Investment-grade and high-yield credit"
      : hy?.cycle_phase === "contraction"
        ? "High-yield credit"
        : "Investment-grade credit";

  return {
    id: "credit-contraction",
    severity: "info",
    title: "Credit Cycle Contraction",
    body: `${segment} is in a contraction phase. Emphasize quality and liquidity in the bond sleeve; avoid reaching for yield until spread conditions stabilize.`,
  };
}

function calloutStaleData(ctx: MarketCalloutContext): MarketCallout | null {
  const status = ctx.dataStatus?.overall_status;
  if (!status || status === "ok") return null;

  return {
    id: "stale-market-data",
    severity: "info",
    title: "Market Data Notice",
    body:
      status === "error"
        ? "Live market data is unavailable or incomplete. Review callouts against current conditions before presenting this report to the client."
        : "Market data may be stale. Confirm current risk scores and yield levels before relying on these callouts in client discussions.",
  };
}

function sortCallouts(callouts: MarketCallout[]): MarketCallout[] {
  return [...callouts].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === "warn" ? -1 : 1;
  });
}

export function buildMarketCallouts(
  ctx: MarketCalloutContext,
  sleeve: SleeveAllocation,
  safetyPct: number
): MarketCallout[] {
  const candidates = [
    calloutInvertedYieldCurve(ctx, sleeve, safetyPct),
    calloutElevatedSmallCap(ctx, sleeve),
    calloutWideHySpreads(ctx, sleeve),
    calloutCreditContraction(ctx, sleeve),
    calloutStaleData(ctx),
  ].filter((c): c is MarketCallout => c !== null);

  return sortCallouts(candidates).slice(0, MAX_CALLOUTS);
}

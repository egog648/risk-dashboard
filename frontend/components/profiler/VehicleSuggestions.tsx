"use client";

import { useMemo } from "react";
import { useTickerRecommendations } from "@/hooks/useTickerRecommendations";
import type { VehicleSuggestion } from "@/lib/profiler/report";
import type { AssetClassKind } from "@/types/tickers";

interface VehicleSuggestionsProps {
  sleevePct: number;
  growthPct: number;
  incomePct: number;
  safetyPct: number;
  aggression: number;
  assetClass: AssetClassKind;
  color: string;
  fallbackVehicles: VehicleSuggestion[];
}

interface DisplayVehicle {
  key: string;
  name: string;
  pct: number;
  rationale?: string;
}

function distributeSleevePct(
  sleevePct: number,
  recommendations: { ticker: string; display_name: string; match_score: number; rationale: string }[]
): DisplayVehicle[] {
  const top = recommendations.slice(0, 3);
  if (top.length === 0) return [];

  const scoreTotal = top.reduce((sum, item) => sum + item.match_score, 0) || 1;
  const allocated: DisplayVehicle[] = [];
  let running = 0;

  top.forEach((item, index) => {
    const isLast = index === top.length - 1;
    const pct = isLast
      ? sleevePct - running
      : Math.round((sleevePct * item.match_score) / scoreTotal);
    running += pct;
    allocated.push({
      key: item.ticker,
      name: `${item.ticker} — ${item.display_name}`,
      pct,
      rationale: item.rationale,
    });
  });

  return allocated;
}

function VehicleTable({
  color,
  vehicles,
}: {
  color: string;
  vehicles: DisplayVehicle[];
}) {
  if (vehicles.length === 0) return null;
  return (
    <table className="w-full border-collapse text-[11px] mt-2">
      <thead>
        <tr>
          <th
            className="text-white px-2.5 py-1.5 text-left font-semibold text-[10px] uppercase tracking-wide rounded-tl-md"
            style={{ background: color }}
          >
            Vehicle
          </th>
          <th
            className="text-white px-2.5 py-1.5 text-right font-semibold text-[10px] uppercase tracking-wide rounded-tr-md"
            style={{ background: color }}
          >
            % of Portfolio
          </th>
        </tr>
      </thead>
      <tbody>
        {vehicles.map((v) => (
          <tr key={v.key} className="even:bg-[#f8fafc]">
            <td className="px-2.5 py-1.5 border-b border-[#e8edf2] text-ff-text-secondary">
              <div>{v.name}</div>
              {v.rationale && (
                <div className="text-[10px] text-ff-muted mt-0.5">{v.rationale}</div>
              )}
            </td>
            <td className="px-2.5 py-1.5 border-b border-[#e8edf2] font-bold text-ff-navy text-right align-top">
              {v.pct}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function VehicleSuggestions({
  sleevePct,
  growthPct,
  incomePct,
  safetyPct,
  aggression,
  assetClass,
  color,
  fallbackVehicles,
}: VehicleSuggestionsProps) {
  const { data, isLoading, isError } = useTickerRecommendations(
    {
      growth_pct: growthPct,
      income_pct: incomePct,
      safety_pct: safetyPct,
      aggression,
      asset_class: assetClass,
      limit: 5,
    },
    sleevePct > 0
  );

  const vehicles = useMemo((): DisplayVehicle[] => {
    const recs = data?.recommendations ?? [];
    if (recs.length > 0) {
      return distributeSleevePct(sleevePct, recs);
    }
    if (isLoading || isError) {
      return fallbackVehicles.map((v) => ({
        key: v.name,
        name: v.name,
        pct: v.pct,
      }));
    }
    return fallbackVehicles.map((v) => ({
      key: v.name,
      name: v.name,
      pct: v.pct,
    }));
  }, [data, fallbackVehicles, isError, isLoading, sleevePct]);

  if (isLoading && vehicles.length === 0) {
    return <div className="text-[11px] text-ff-muted mt-2">Loading registry matches...</div>;
  }

  return <VehicleTable color={color} vehicles={vehicles} />;
}

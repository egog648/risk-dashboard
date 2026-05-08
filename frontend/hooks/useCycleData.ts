import { useQuery } from "@tanstack/react-query";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllCredit } from "@/lib/api/credit";
import { fetchAllHardAssets } from "@/lib/api/hardAssets";
import { fetchAllCash } from "@/lib/api/cash";
import type { CyclePhase } from "@/types/assets";

const STALE_TIME = 5 * 60 * 1000;

export interface CycleSummary {
  assetClass: string;
  subClass: string;
  phase: CyclePhase;
  riskScore: number;
}

/**
 * Returns a flat list of cycle phase summaries for all sub-asset classes.
 * Used for the cycle indicator components.
 */
export function useCycleData() {
  const equities = useQuery({
    queryKey: ["equities"],
    queryFn: fetchAllEquities,
    staleTime: STALE_TIME,
  });
  const credit = useQuery({
    queryKey: ["credit"],
    queryFn: fetchAllCredit,
    staleTime: STALE_TIME,
  });
  const hardAssets = useQuery({
    queryKey: ["hard-assets"],
    queryFn: fetchAllHardAssets,
    staleTime: STALE_TIME,
  });
  const cash = useQuery({
    queryKey: ["cash"],
    queryFn: fetchAllCash,
    staleTime: STALE_TIME,
  });

  const all = [
    ...(equities.data ?? []),
    ...(credit.data ?? []),
    ...(hardAssets.data ?? []),
    ...(cash.data ?? []),
  ];

  const cycles: CycleSummary[] = all.map((a) => ({
    assetClass: a.asset_class,
    subClass: a.sub_class,
    phase: a.cycle_phase,
    riskScore: a.risk_score,
  }));

  return {
    cycles,
    isLoading:
      equities.isLoading ||
      credit.isLoading ||
      hardAssets.isLoading ||
      cash.isLoading,
  };
}

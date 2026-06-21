import { useQuery } from "@tanstack/react-query";
import { fetchTickerRecommendations } from "@/lib/api/tickers";
import type { AssetClassKind } from "@/types/tickers";

export function useTickerRecommendations(
  params: {
    growth_pct: number;
    income_pct: number;
    safety_pct: number;
    aggression: number;
    asset_class: AssetClassKind;
    limit?: number;
  },
  enabled = true
) {
  return useQuery({
    queryKey: ["ticker-recommendations", params],
    queryFn: () => fetchTickerRecommendations(params),
    enabled,
  });
}

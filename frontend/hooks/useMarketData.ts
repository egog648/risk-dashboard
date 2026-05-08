import { useQuery } from "@tanstack/react-query";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllCredit } from "@/lib/api/credit";
import { fetchAllHardAssets } from "@/lib/api/hardAssets";
import { fetchAllCash } from "@/lib/api/cash";
import type { AssetClassMetrics } from "@/types/assets";

const STALE_TIME = 5 * 60 * 1000;

/**
 * Fetches all asset classes in parallel for the overview dashboard.
 * Returns a flat list combined from all 4 asset classes.
 */
export function useAllMarketData() {
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

  const all: AssetClassMetrics[] = [
    ...(equities.data ?? []),
    ...(credit.data ?? []),
    ...(hardAssets.data ?? []),
    ...(cash.data ?? []),
  ];

  const isLoading =
    equities.isLoading ||
    credit.isLoading ||
    hardAssets.isLoading ||
    cash.isLoading;

  const isError =
    equities.isError ||
    credit.isError ||
    hardAssets.isError ||
    cash.isError;

  return { data: all, isLoading, isError };
}

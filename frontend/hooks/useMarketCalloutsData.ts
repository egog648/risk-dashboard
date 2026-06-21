import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllCredit, fetchYieldCurve } from "@/lib/api/credit";
import { DATA_STATUS_STALE_TIME, fetchDataStatus } from "@/lib/api/dataStatus";
import {
  buildMarketCallouts,
  type MarketCallout,
} from "@/lib/reports/buildMarketCallouts";
import type { SleeveAllocation } from "@/types/clients";

export function useMarketCalloutsData(
  sleeve: SleeveAllocation | null,
  safetyPct: number,
  enabled = true
): {
  callouts: MarketCallout[];
  isLoading: boolean;
  hasData: boolean;
} {
  const active = enabled && sleeve !== null;

  const equities = useQuery({
    queryKey: ["equities"],
    queryFn: fetchAllEquities,
    staleTime: DATA_STATUS_STALE_TIME,
    enabled: active,
  });
  const credit = useQuery({
    queryKey: ["credit"],
    queryFn: fetchAllCredit,
    staleTime: DATA_STATUS_STALE_TIME,
    enabled: active,
  });
  const yieldCurve = useQuery({
    queryKey: ["yield-curve"],
    queryFn: fetchYieldCurve,
    staleTime: DATA_STATUS_STALE_TIME,
    enabled: active,
  });
  const dataStatus = useQuery({
    queryKey: ["data-status"],
    queryFn: fetchDataStatus,
    staleTime: DATA_STATUS_STALE_TIME,
    enabled: active,
  });

  const isLoading =
    equities.isLoading ||
    credit.isLoading ||
    yieldCurve.isLoading ||
    dataStatus.isLoading;

  const callouts = useMemo(() => {
    if (!sleeve) return [];
    return buildMarketCallouts(
      {
        equities: equities.data ?? [],
        credit: credit.data ?? [],
        yieldCurve: yieldCurve.data ?? null,
        dataStatus: dataStatus.data ?? null,
      },
      sleeve,
      safetyPct
    );
  }, [
    sleeve,
    safetyPct,
    equities.data,
    credit.data,
    yieldCurve.data,
    dataStatus.data,
  ]);

  const hasData =
    (equities.data?.length ?? 0) > 0 ||
    (credit.data?.length ?? 0) > 0 ||
    (yieldCurve.data?.points?.length ?? 0) > 0 ||
    dataStatus.data != null;

  return { callouts, isLoading, hasData };
}

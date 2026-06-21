import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllCredit, fetchYieldCurve } from "@/lib/api/credit";
import {
  buildMarketCallouts,
  type MarketCallout,
} from "@/lib/reports/buildMarketCallouts";
import type { SleeveAllocation } from "@/lib/profiler/report";
import { apiClient } from "@/lib/api/client";
import type { DataStatusResponse } from "@/types/assets";

const STALE_TIME = 5 * 60 * 1000;

async function fetchDataStatus(): Promise<DataStatusResponse> {
  const { data } = await apiClient.get<DataStatusResponse>("/data-status");
  return data;
}

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
    staleTime: STALE_TIME,
    enabled: active,
  });
  const credit = useQuery({
    queryKey: ["credit"],
    queryFn: fetchAllCredit,
    staleTime: STALE_TIME,
    enabled: active,
  });
  const yieldCurve = useQuery({
    queryKey: ["yield-curve"],
    queryFn: fetchYieldCurve,
    staleTime: STALE_TIME,
    enabled: active,
  });
  const dataStatus = useQuery({
    queryKey: ["data-status"],
    queryFn: fetchDataStatus,
    staleTime: STALE_TIME,
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

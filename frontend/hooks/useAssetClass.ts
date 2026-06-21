import { useQuery } from "@tanstack/react-query";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllCredit } from "@/lib/api/credit";
import { fetchAllHardAssets } from "@/lib/api/hardAssets";
import { fetchAllCash } from "@/lib/api/cash";
import { queryKeys } from "@/lib/queryKeys";
import type { AssetClassMetrics } from "@/types/assets";

const STALE_TIME = 5 * 60 * 1000;

export function useEquities(includeHistory = false) {
  return useQuery<AssetClassMetrics[]>({
    queryKey: queryKeys.equities(includeHistory),
    queryFn: () => fetchAllEquities(includeHistory),
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

export function useCredit(includeHistory = false) {
  return useQuery<AssetClassMetrics[]>({
    queryKey: queryKeys.credit(includeHistory),
    queryFn: () => fetchAllCredit(includeHistory),
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

export function useHardAssets(includeHistory = false) {
  return useQuery<AssetClassMetrics[]>({
    queryKey: queryKeys.hardAssets(includeHistory),
    queryFn: () => fetchAllHardAssets(includeHistory),
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

export function useCash(includeHistory = false) {
  return useQuery<AssetClassMetrics[]>({
    queryKey: queryKeys.cash(includeHistory),
    queryFn: () => fetchAllCash(includeHistory),
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

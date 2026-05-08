import { useQuery } from "@tanstack/react-query";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllCredit } from "@/lib/api/credit";
import { fetchAllHardAssets } from "@/lib/api/hardAssets";
import { fetchAllCash } from "@/lib/api/cash";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useEquities() {
  return useQuery({
    queryKey: ["equities"],
    queryFn: fetchAllEquities,
    staleTime: STALE_TIME,
  });
}

export function useCredit() {
  return useQuery({
    queryKey: ["credit"],
    queryFn: fetchAllCredit,
    staleTime: STALE_TIME,
  });
}

export function useHardAssets() {
  return useQuery({
    queryKey: ["hard-assets"],
    queryFn: fetchAllHardAssets,
    staleTime: STALE_TIME,
  });
}

export function useCash() {
  return useQuery({
    queryKey: ["cash"],
    queryFn: fetchAllCash,
    staleTime: STALE_TIME,
  });
}

import type { QueryClient } from "@tanstack/react-query";
import { fetchAllCash } from "@/lib/api/cash";
import { fetchAllCredit } from "@/lib/api/credit";
import { fetchAllEquities } from "@/lib/api/equities";
import { fetchAllHardAssets } from "@/lib/api/hardAssets";
import { queryKeys } from "@/lib/queryKeys";

const STALE_TIME = 5 * 60 * 1000;

const ROUTE_PREFETCH: Record<
  string,
  Array<{ key: readonly unknown[]; fn: () => Promise<unknown> }>
> = {
  "/": [
    { key: queryKeys.equities(false), fn: () => fetchAllEquities(false) },
    { key: queryKeys.credit(false), fn: () => fetchAllCredit(false) },
    { key: queryKeys.hardAssets(false), fn: () => fetchAllHardAssets(false) },
    { key: queryKeys.cash(false), fn: () => fetchAllCash(false) },
  ],
  "/equities": [
    { key: queryKeys.equities(true), fn: () => fetchAllEquities(true) },
  ],
  "/credit": [
    { key: queryKeys.credit(true), fn: () => fetchAllCredit(true) },
  ],
  "/hard-assets": [
    { key: queryKeys.hardAssets(true), fn: () => fetchAllHardAssets(true) },
  ],
  "/cash": [{ key: queryKeys.cash(true), fn: () => fetchAllCash(true) }],
};

export function prefetchRouteData(queryClient: QueryClient, href: string) {
  const targets = ROUTE_PREFETCH[href];
  if (!targets) return;

  targets.forEach(({ key, fn }) => {
    void queryClient.prefetchQuery({
      queryKey: key,
      queryFn: fn,
      staleTime: STALE_TIME,
    });
  });
}

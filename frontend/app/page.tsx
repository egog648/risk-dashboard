import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { serverAssetFetchers } from "@/lib/api/server";
import { queryKeys } from "@/lib/queryKeys";
import OverviewPage from "./OverviewPage";

export default async function Page() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.equities(false),
      queryFn: () => serverAssetFetchers.equities(false),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.credit(false),
      queryFn: () => serverAssetFetchers.credit(false),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.hardAssets(false),
      queryFn: () => serverAssetFetchers.hardAssets(false),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.cash(false),
      queryFn: () => serverAssetFetchers.cash(false),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OverviewPage />
    </HydrationBoundary>
  );
}

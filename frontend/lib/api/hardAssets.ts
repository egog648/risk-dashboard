import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllHardAssets(
  includeHistory = false
): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/hard-assets/all", {
    params: { include_history: includeHistory },
  });
  return data;
}

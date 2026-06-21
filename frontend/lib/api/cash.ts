import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllCash(
  includeHistory = false
): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/cash/all", {
    params: { include_history: includeHistory },
  });
  return data;
}

import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllEquities(
  includeHistory = false
): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/equities/all", {
    params: { include_history: includeHistory },
  });
  return data;
}

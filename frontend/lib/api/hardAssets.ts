import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllHardAssets(): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/hard-assets/all");
  return data;
}

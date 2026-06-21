import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllCash(): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/cash/all");
  return data;
}

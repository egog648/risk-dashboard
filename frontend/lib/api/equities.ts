import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllEquities(): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/equities/all");
  return data;
}

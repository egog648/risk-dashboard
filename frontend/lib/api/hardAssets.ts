import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchGold(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/hard-assets/gold");
  return data;
}

export async function fetchREITs(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/hard-assets/reits");
  return data;
}

export async function fetchCommodities(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/hard-assets/commodities");
  return data;
}

export async function fetchAllHardAssets(): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/hard-assets/all");
  return data;
}

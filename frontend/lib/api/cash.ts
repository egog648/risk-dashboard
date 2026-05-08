import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchMoneyMarket(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/cash/money-market");
  return data;
}

export async function fetchAllCash(): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/cash/all");
  return data;
}

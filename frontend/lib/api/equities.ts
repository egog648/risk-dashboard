import type { AssetClassMetrics } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchLargeCap(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/equities/large-cap");
  return data;
}

export async function fetchMidCap(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/equities/mid-cap");
  return data;
}

export async function fetchSmallCap(): Promise<AssetClassMetrics> {
  const { data } = await apiClient.get<AssetClassMetrics>("/equities/small-cap");
  return data;
}

export async function fetchAllEquities(): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/equities/all");
  return data;
}

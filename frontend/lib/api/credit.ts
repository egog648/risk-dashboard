import type { AssetClassMetrics, YieldCurveResponse } from "@/types/assets";
import { apiClient } from "./client";

export async function fetchAllCredit(
  includeHistory = false
): Promise<AssetClassMetrics[]> {
  const { data } = await apiClient.get<AssetClassMetrics[]>("/credit/all", {
    params: { include_history: includeHistory },
  });
  return data;
}

export async function fetchYieldCurve(): Promise<YieldCurveResponse> {
  const { data } = await apiClient.get<YieldCurveResponse>("/credit/yield-curve");
  return data;
}

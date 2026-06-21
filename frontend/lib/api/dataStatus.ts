import type { DataStatusResponse } from "@/types/assets";
import { apiClient } from "./client";

export const DATA_STATUS_STALE_TIME = 60 * 1000;

export async function fetchDataStatus(): Promise<DataStatusResponse> {
  const { data } = await apiClient.get<DataStatusResponse>("/data-status");
  return data;
}

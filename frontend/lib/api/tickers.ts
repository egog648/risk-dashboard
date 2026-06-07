import { apiClient } from "./client";
import type { CustomTicker, CustomTickerCreate } from "@/types/tickers";

export async function fetchTickers(params?: {
  asset_class?: string;
  primary_objective?: string;
}): Promise<CustomTicker[]> {
  const { data } = await apiClient.get<CustomTicker[]>("/tickers", { params });
  return data;
}

export async function createTicker(payload: CustomTickerCreate): Promise<CustomTicker> {
  const { data } = await apiClient.post<CustomTicker>("/tickers", payload);
  return data;
}

export async function updateTicker(
  id: number,
  payload: Partial<CustomTickerCreate> & { is_active?: boolean }
): Promise<CustomTicker> {
  const { data } = await apiClient.put<CustomTicker>(`/tickers/${id}`, payload);
  return data;
}

export async function deactivateTicker(id: number): Promise<CustomTicker> {
  const { data } = await apiClient.delete<CustomTicker>(`/tickers/${id}`);
  return data;
}

export async function validateTickerSymbol(ticker: string): Promise<boolean> {
  const { data } = await apiClient.post<{ valid: boolean }>("/tickers/validate", {
    ticker,
  });
  return data.valid;
}

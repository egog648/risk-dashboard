import { apiClient } from "./client";
import type {
  CustomTicker,
  CustomTickerCreate,
  TickerRecommendResponse,
} from "@/types/tickers";

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

export async function fetchTickerRecommendations(params: {
  growth_pct: number;
  income_pct: number;
  safety_pct: number;
  aggression: number;
  asset_class: string;
  limit?: number;
}): Promise<TickerRecommendResponse> {
  const { data } = await apiClient.get<TickerRecommendResponse>("/tickers/recommend", {
    params,
  });
  return data;
}

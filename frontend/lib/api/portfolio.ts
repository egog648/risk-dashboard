import type { PortfolioWeights } from "@/types/portfolio";
import { apiClient } from "./client";
import type { EfficientFrontierResponse } from "@/types/portfolio";

export async function fetchEfficientFrontier(
  weights: PortfolioWeights,
  highDetail = false
): Promise<EfficientFrontierResponse> {
  const { data } = await apiClient.post<EfficientFrontierResponse>(
    "/portfolio/frontier",
    weights,
    { params: { high_detail: highDetail } }
  );
  return data;
}

import type { EfficientFrontierResponse, PortfolioWeights } from "@/types/portfolio";
import { apiClient } from "./client";

export async function fetchEfficientFrontier(
  weights: PortfolioWeights
): Promise<EfficientFrontierResponse> {
  const { data } = await apiClient.post<EfficientFrontierResponse>(
    "/portfolio/frontier",
    weights
  );
  return data;
}

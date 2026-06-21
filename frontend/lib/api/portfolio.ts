import type { FrontierRequest, EfficientFrontierResponse } from "@/types/portfolio";
import { apiClient } from "./client";

export async function fetchEfficientFrontier(
  request: FrontierRequest,
  highDetail = false
): Promise<EfficientFrontierResponse> {
  const params = { high_detail: highDetail };

  // Send flat PortfolioWeights for backward compatibility with legacy backend.
  const { data } = await apiClient.post<EfficientFrontierResponse>(
    "/portfolio/frontier",
    request.weights,
    { params }
  );

  if (!request.suggested_weights) {
    return data;
  }

  const { data: suggestedData } = await apiClient.post<EfficientFrontierResponse>(
    "/portfolio/frontier",
    request.suggested_weights,
    { params }
  );

  return {
    ...data,
    suggested: suggestedData.current,
  };
}

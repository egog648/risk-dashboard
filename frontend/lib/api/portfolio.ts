import type {
  FrontierRequest,
  EfficientFrontierResponse,
  PortfolioAnalyticsRequest,
  PortfolioAnalyticsResponse,
  OptimizationConstraintsPayload,
} from "@/types/portfolio";
import { apiClient } from "./client";

export async function fetchEfficientFrontier(
  request: FrontierRequest,
  highDetail = false,
  profileId?: number | null
): Promise<EfficientFrontierResponse> {
  const params: Record<string, unknown> = { high_detail: highDetail };
  if (profileId) {
    params.profile_id = profileId;
  }

  const body: Record<string, unknown> = {
    weights: request.weights,
  };
  if (request.suggested_weights) {
    body.suggested_weights = request.suggested_weights;
  }
  if (request.constraints) {
    body.constraints = request.constraints;
  }

  const { data } = await apiClient.post<EfficientFrontierResponse>(
    "/portfolio/frontier",
    body,
    { params }
  );

  return data;
}

export async function fetchPortfolioAnalytics(
  request: PortfolioAnalyticsRequest
): Promise<PortfolioAnalyticsResponse> {
  const { data } = await apiClient.post<PortfolioAnalyticsResponse>(
    "/portfolio/analytics",
    request
  );
  return data;
}

export type { OptimizationConstraintsPayload };

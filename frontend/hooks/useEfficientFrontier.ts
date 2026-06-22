import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchEfficientFrontier } from "@/lib/api/portfolio";
import type { OptimizationConstraintsPayload, PortfolioWeights } from "@/types/portfolio";

interface FrontierMutationInput {
  weights: PortfolioWeights;
  suggestedWeights?: PortfolioWeights | null;
  highDetail?: boolean;
  constraints?: OptimizationConstraintsPayload | null;
  profileId?: number | null;
}

export function useEfficientFrontier() {
  return useMutation({
    mutationKey: ["efficientFrontier"],
    mutationFn: ({
      weights,
      suggestedWeights,
      highDetail = false,
      constraints,
      profileId,
    }: FrontierMutationInput) =>
      fetchEfficientFrontier(
        {
          weights,
          ...(suggestedWeights ? { suggested_weights: suggestedWeights } : {}),
          ...(constraints ? { constraints } : {}),
        },
        highDetail,
        profileId
      ),
  });
}

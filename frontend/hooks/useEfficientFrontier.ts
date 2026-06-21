import { useMutation } from "@tanstack/react-query";
import { fetchEfficientFrontier } from "@/lib/api/portfolio";
import type { PortfolioWeights } from "@/types/portfolio";

interface FrontierMutationInput {
  weights: PortfolioWeights;
  suggestedWeights?: PortfolioWeights | null;
  highDetail?: boolean;
}

export function useEfficientFrontier() {
  return useMutation({
    mutationKey: ["efficientFrontier"],
    mutationFn: ({ weights, suggestedWeights, highDetail = false }: FrontierMutationInput) =>
      fetchEfficientFrontier(
        {
          weights,
          ...(suggestedWeights ? { suggested_weights: suggestedWeights } : {}),
        },
        highDetail
      ),
  });
}

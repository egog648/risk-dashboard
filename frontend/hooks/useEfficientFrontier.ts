import { useMutation } from "@tanstack/react-query";
import { fetchEfficientFrontier } from "@/lib/api/portfolio";
import type { PortfolioWeights } from "@/types/portfolio";

interface FrontierMutationInput {
  weights: PortfolioWeights;
  highDetail?: boolean;
}

export function useEfficientFrontier() {
  return useMutation({
    mutationFn: ({ weights, highDetail = false }: FrontierMutationInput) =>
      fetchEfficientFrontier(weights, highDetail),
  });
}

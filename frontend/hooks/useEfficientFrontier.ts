import { useMutation } from "@tanstack/react-query";
import { fetchEfficientFrontier } from "@/lib/api/portfolio";
import type { PortfolioWeights } from "@/types/portfolio";

export function useEfficientFrontier() {
  return useMutation({
    mutationFn: (weights: PortfolioWeights) => fetchEfficientFrontier(weights),
  });
}

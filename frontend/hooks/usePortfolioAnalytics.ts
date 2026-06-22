import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioAnalytics } from "@/lib/api/portfolio";
import type { ClientProfile, Portfolio } from "@/types/clients";
import type { PortfolioWeights } from "@/types/portfolio";

interface UsePortfolioAnalyticsInput {
  weights: PortfolioWeights;
  effectiveProfile?: ClientProfile | null;
  portfolio?: Portfolio | null;
  enabled?: boolean;
}

export function usePortfolioAnalytics({
  weights,
  effectiveProfile,
  portfolio,
  enabled = true,
}: UsePortfolioAnalyticsInput) {
  return useQuery({
    queryKey: [
      "portfolioAnalytics",
      weights,
      effectiveProfile?.id,
      portfolio?.id,
      portfolio?.portfolio_value_usd,
      portfolio?.annual_income_need_usd,
      portfolio?.annual_income_need_pct,
    ],
    queryFn: () =>
      fetchPortfolioAnalytics({
        weights,
        profile_id: effectiveProfile?.id,
        governor_cap_pct: effectiveProfile?.governor_cap_pct,
        answers: effectiveProfile?.answers,
        portfolio_value_usd: portfolio?.portfolio_value_usd ?? undefined,
        annual_income_need_usd: portfolio?.annual_income_need_usd ?? undefined,
        annual_income_need_pct: portfolio?.annual_income_need_pct ?? undefined,
      }),
    enabled,
    staleTime: 60_000,
  });
}

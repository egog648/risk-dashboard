"use client";

import { useState, useEffect } from "react";
import { useEfficientFrontier } from "@/hooks/useEfficientFrontier";
import { AllocationSliders } from "@/components/portfolio/AllocationSliders";
import { EfficientFrontierChart } from "@/components/dashboard/EfficientFrontierChart";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { DEFAULT_WEIGHTS } from "@/types/portfolio";
import type { PortfolioWeights } from "@/types/portfolio";

export default function PortfolioPage() {
  const [weights, setWeights] = useState<PortfolioWeights>(DEFAULT_WEIGHTS);
  const { mutate, data, isPending, isError } = useEfficientFrontier();

  // Compute frontier on mount with default weights
  useEffect(() => {
    mutate(weights);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWeightsChange = (newWeights: PortfolioWeights) => {
    setWeights(newWeights);
  };

  const handleRun = () => {
    mutate(weights);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Portfolio Optimizer</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Adjust allocation weights and explore the efficient frontier using
          fundamental-based expected returns
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <FinesseCard title="Portfolio Weights" padding="lg" className="xl:col-span-1">
          <AllocationSliders
            weights={weights}
            onChange={handleWeightsChange}
            onRun={handleRun}
            isLoading={isPending}
          />
        </FinesseCard>

        <FinesseCard title="Efficient Frontier" padding="lg" className="xl:col-span-2">
          {isPending && (
            <div className="text-ff-muted text-sm">Computing frontier...</div>
          )}
          {isError && (
            <div className="text-red-400 text-sm">
              Failed to compute frontier. Ensure backend data is seeded.
            </div>
          )}
          {data && <EfficientFrontierChart data={data} />}
        </FinesseCard>
      </div>

      {data?.correlation_matrix && (
        <FinesseCard title="Correlation Matrix" padding="lg">
          <CorrelationHeatmap matrix={data.correlation_matrix} />
        </FinesseCard>
      )}
    </div>
  );
}

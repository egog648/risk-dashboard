"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useEfficientFrontier } from "@/hooks/useEfficientFrontier";
import { AllocationSliders } from "@/components/portfolio/AllocationSliders";
import { FrontierControls } from "@/components/portfolio/FrontierControls";
import { FrontierDetailToggle } from "@/components/portfolio/FrontierDetailToggle";
import { EfficientFrontierChart } from "@/components/dashboard/lazyDashboard";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { loadPrefillWeights } from "@/components/profiler/SendToOptimizerButton";
import { DEFAULT_WEIGHTS } from "@/types/portfolio";
import type { PortfolioWeights } from "@/types/portfolio";

function PortfolioPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-64 bg-ff-border rounded" />
        <div className="h-4 w-96 bg-ff-border rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="h-96 bg-ff-border rounded-xl xl:col-span-1" />
        <div className="h-96 bg-ff-border rounded-xl xl:col-span-2" />
      </div>
    </div>
  );
}

function PortfolioPageContent() {
  const searchParams = useSearchParams();
  const [weights, setWeights] = useState<PortfolioWeights>(DEFAULT_WEIGHTS);
  const [highDetail, setHighDetail] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const { mutate, data, isPending, isError } = useEfficientFrontier();

  useEffect(() => {
    if (searchParams?.get("prefill") === "1") {
      const prefill = loadPrefillWeights();
      if (prefill) {
        setWeights(prefill);
        setPrefilled(true);
        mutate({ weights: prefill, highDetail });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWeightsChange = (newWeights: PortfolioWeights) => {
    setWeights(newWeights);
  };

  const handleRun = () => {
    mutate({ weights, highDetail });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Portfolio Optimizer</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Adjust allocation weights and explore the efficient frontier using
          fundamental-based expected returns
        </p>
        {prefilled && (
          <p className="text-xs text-ff-green mt-1 font-semibold">
            Weights pre-filled from client portfolio outline
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <FinesseCard title="Portfolio Weights" padding="lg" className="xl:col-span-1">
          <AllocationSliders
            weights={weights}
            onChange={handleWeightsChange}
            onRun={handleRun}
            isLoading={isPending}
          />
          <FrontierDetailToggle highDetail={highDetail} onChange={setHighDetail} />
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
          {!isPending && !data && !isError && (
            <div className="text-ff-muted text-sm py-16 text-center">
              Adjust weights and click Run Optimizer to compute the efficient frontier.
            </div>
          )}
          {data && (
            <>
              <EfficientFrontierChart data={data} />
              <FrontierControls
                maxSharpe={data.max_sharpe}
                minVol={data.min_vol}
                current={data.current}
              />
            </>
          )}
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

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioPageSkeleton />}>
      <PortfolioPageContent />
    </Suspense>
  );
}

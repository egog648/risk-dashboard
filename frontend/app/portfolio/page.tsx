"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useEfficientFrontier } from "@/hooks/useEfficientFrontier";
import { usePortfolioAnalytics } from "@/hooks/usePortfolioAnalytics";
import { useBackendHealth, isBackendStale } from "@/hooks/useBackendHealth";
import { fetchEfficientFrontier } from "@/lib/api/portfolio";
import { formatConstraintSummary } from "@/lib/profiler/constraints";
import { useAllClientPortfolios } from "@/hooks/useAllClientPortfolios";
import { useSelectedPortfolioLoadout } from "@/hooks/useSelectedPortfolioLoadout";
import { AllocationSliders } from "@/components/portfolio/AllocationSliders";
import {
  FrontierControls,
  type SelectedPortfolio,
} from "@/components/portfolio/FrontierControls";
import { FrontierDetailToggle } from "@/components/portfolio/FrontierDetailToggle";
import { PortfolioSelector } from "@/components/portfolio/PortfolioSelector";
import { StressPanel } from "@/components/portfolio/StressPanel";
import { EfficientFrontierChart } from "@/components/dashboard/lazyDashboard";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import {
  clearPrefillWeights,
  peekPrefillWeights,
} from "@/components/profiler/SendToOptimizerButton";
import { DEFAULT_WEIGHTS, WEIGHT_LABELS } from "@/types/portfolio";
import type { EfficientFrontierResponse, FrontierPoint, PortfolioWeights } from "@/types/portfolio";

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

function frontierWeightsToPortfolioWeights(
  weights: Record<string, number>
): PortfolioWeights {
  const keys = Object.keys(WEIGHT_LABELS) as Array<keyof PortfolioWeights>;
  const mapped = keys.reduce((acc, key) => {
    acc[key] = weights[key] ?? 0;
    return acc;
  }, {} as PortfolioWeights);

  const total = Object.values(mapped).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return mapped;

  return keys.reduce((acc, key) => {
    acc[key] = mapped[key] / total;
    return acc;
  }, {} as PortfolioWeights);
}

function PortfolioPageContent() {
  const searchParams = useSearchParams();
  const [weights, setWeights] = useState<PortfolioWeights>(DEFAULT_WEIGHTS);
  const [highDetail, setHighDetail] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<SelectedPortfolio | null>(
    null
  );
  const { mutate, reset, data: mutationData, isPending: isMutationPending, isError: isMutationError } =
    useEfficientFrontier();
  const [prefillData, setPrefillData] = useState<EfficientFrontierResponse | null>(null);
  const [isPrefillPending, setIsPrefillPending] = useState(false);
  const [isPrefillError, setIsPrefillError] = useState(false);
  const prefillStartedRef = useRef(false);
  const lastPortfolioRunRef = useRef<{
    loadKey: string;
    weightsKey: string;
  } | null>(null);

  const { grouped, isLoading: listLoading } = useAllClientPortfolios();
  const loadout = useSelectedPortfolioLoadout();
  const { data: backendHealth } = useBackendHealth();
  const backendStale = isBackendStale(backendHealth);

  const data = mutationData ?? prefillData;
  const isPending = isMutationPending || isPrefillPending || loadout.isLoading;
  const isError = isMutationError || isPrefillError;

  const runFrontier = useCallback(
    (nextWeights: PortfolioWeights, highDetailMode = highDetail) => {
      setSelectedPortfolio(null);
      setPrefillData(null);
      setIsPrefillError(false);
      mutate({
        weights: nextWeights,
        highDetail: highDetailMode,
        constraints: loadout.constraints,
        profileId: loadout.effectiveProfile?.id,
      });
    },
    [highDetail, loadout.constraints, loadout.effectiveProfile?.id, mutate]
  );

  useEffect(() => {
    if (searchParams?.get("prefill") !== "1") return;

    const prefill = peekPrefillWeights();
    if (!prefill) return;

    setWeights(prefill);
    setPrefilled(true);
    setPrefillBanner("Weights pre-filled from client portfolio outline");

    if (prefillStartedRef.current) return;
    prefillStartedRef.current = true;

    setIsPrefillPending(true);
    setIsPrefillError(false);
    fetchEfficientFrontier({ weights: prefill }, highDetail)
      .then((result) => {
        setPrefillData(result);
        clearPrefillWeights();
      })
      .catch(() => {
        prefillStartedRef.current = false;
        setIsPrefillError(true);
      })
      .finally(() => {
        setIsPrefillPending(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loadout.hasSelection || loadout.isLoading) return;
    if (!loadout.client || !loadout.portfolio) return;

    const loadKey = `${loadout.clientId}:${loadout.portfolioId}`;
    const weightsKey = JSON.stringify(loadout.sliderWeights);
    const last = lastPortfolioRunRef.current;
    if (last?.loadKey === loadKey && last.weightsKey === weightsKey) {
      return;
    }
    lastPortfolioRunRef.current = { loadKey, weightsKey };

    setWeights(loadout.sliderWeights);
    setPrefilled(true);
    setPrefillBanner(
      loadout.loadedFromOutline
        ? `Loaded from ${loadout.client.name} — ${loadout.portfolio.name}`
        : `Loaded ${loadout.client.name} — ${loadout.portfolio.name} (default weights; suggested portfolio from risk profile)`
    );

    runFrontier(loadout.sliderWeights);
  }, [
    loadout.hasSelection,
    loadout.isLoading,
    loadout.client,
    loadout.portfolio,
    loadout.clientId,
    loadout.portfolioId,
    loadout.sliderWeights,
    loadout.loadedFromOutline,
    runFrontier,
  ]);

  useEffect(() => {
    setSelectedPortfolio(null);
  }, [data]);

  const handleWeightsChange = (newWeights: PortfolioWeights) => {
    setWeights(newWeights);
  };

  const handleRun = () => {
    runFrontier(weights);
  };

  const handleApplyOptimized = (point: FrontierPoint) => {
    setWeights(frontierWeightsToPortfolioWeights(point.weights));
  };

  const handlePortfolioSelect = (clientId: number | null, portfolioId: number | null) => {
    lastPortfolioRunRef.current = null;
    reset();
    setPrefillBanner(null);
    setPrefilled(false);
    if (!clientId || !portfolioId) {
      setWeights(DEFAULT_WEIGHTS);
      setPrefillData(null);
      setSelectedPortfolio(null);
    }
    loadout.selectPortfolio(clientId, portfolioId);
  };

  const showSuggested =
    loadout.hasSelection &&
    Boolean(loadout.constraints?.max_portfolio_vol);

  const suggestedRiskLabel = loadout.effectiveProfile
    ? `${loadout.effectiveProfile.risk_label} (${loadout.effectiveProfile.governed_aggression_pct}%)`
    : undefined;

  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } =
    usePortfolioAnalytics({
      weights,
      effectiveProfile: loadout.effectiveProfile,
      portfolio: loadout.portfolio,
      enabled: Boolean(data),
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Portfolio Optimizer</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Adjust allocation weights and explore the efficient frontier using
          fundamental-based expected returns
        </p>
        {backendStale && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Backend is running an older build without analytics support. Restart the API
            server (`python -m uvicorn app.main:app --reload` from `backend/`) to load stress
            scenarios and suggested portfolio metrics.
          </p>
        )}
        {prefilled && prefillBanner && (
          <p className="text-xs text-ff-green mt-1 font-semibold">{prefillBanner}</p>
        )}
      </div>

      <PortfolioSelector
        grouped={grouped}
        selectedClientId={loadout.clientId}
        selectedPortfolioId={loadout.portfolioId}
        isLoading={loadout.isLoading}
        listLoading={listLoading}
        clientName={loadout.client?.name}
        portfolioName={loadout.portfolio?.name}
        effectiveProfile={loadout.effectiveProfile}
        onSelect={handlePortfolioSelect}
      />

      {loadout.constraints && (
        <p className="text-xs text-ff-navy bg-[#eaf1f8] border border-ff-border rounded-lg px-3 py-2">
          <span className="font-semibold">Governor constraints: </span>
          {formatConstraintSummary(loadout.constraints)}
        </p>
      )}

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
              <FrontierControls
                maxSharpe={data.max_sharpe}
                minVol={data.min_vol}
                current={data.current}
                suggested={data.suggested ?? null}
                showSuggested={showSuggested}
                suggestedRiskLabel={suggestedRiskLabel}
                selected={selectedPortfolio}
                onSelect={setSelectedPortfolio}
                onApplyOptimized={handleApplyOptimized}
                constraintWarnings={data.constraint_warnings}
                maxPortfolioVol={data.constraints_applied?.max_portfolio_vol}
              />
              <EfficientFrontierChart data={data} />
            </>
          )}
        </FinesseCard>
      </div>

      {data && (
        <FinesseCard title="Stress Scenarios" padding="lg">
          {analyticsLoading && (
            <p className="text-sm text-ff-muted">Loading stress scenarios...</p>
          )}
          {analyticsError && (
            <p className="text-sm text-red-500">
              {backendStale
                ? "Stress scenarios require a backend restart to load the analytics endpoint."
                : "Failed to load stress scenarios. Ensure the backend is running and data is seeded."}
            </p>
          )}
          {!analyticsLoading && !analyticsError && analytics && (
            <StressPanel
              scenarios={analytics.stress}
              tolerancePct={analytics.stress[0]?.tolerance_pct}
            />
          )}
        </FinesseCard>
      )}

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

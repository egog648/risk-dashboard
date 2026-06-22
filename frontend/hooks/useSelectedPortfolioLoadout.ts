"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useClient,
  useOutlines,
  usePortfolio,
  useProfiles,
} from "@/hooks/useClients";
import { mapProfileToPortfolioWeights } from "@/lib/profiler/mapProfileToPortfolioWeights";
import { constraintsFromProfile } from "@/lib/profiler/constraints";
import { DEFAULT_WEIGHTS } from "@/types/portfolio";
import type { ClientProfile } from "@/types/clients";
import type { OptimizationConstraintsPayload, PortfolioWeights } from "@/types/portfolio";

export function useSelectedPortfolioLoadout() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = Number(searchParams.get("clientId") || 0);
  const portfolioId = Number(searchParams.get("portfolioId") || 0);
  const hasSelection = clientId > 0 && portfolioId > 0;

  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(
    clientId,
    portfolioId
  );
  const { data: profiles, isLoading: profilesLoading } = useProfiles(clientId);
  const { data: outlines, isLoading: outlinesLoading } = useOutlines(
    clientId,
    portfolioId
  );

  const effectiveProfile = useMemo<ClientProfile | null>(() => {
    if (!profiles || !portfolio?.effective_profile_id) return null;
    return profiles.find((profile) => profile.id === portfolio.effective_profile_id) ?? null;
  }, [profiles, portfolio?.effective_profile_id]);

  const suggestedWeights = useMemo(
    () => (effectiveProfile ? mapProfileToPortfolioWeights(effectiveProfile) : null),
    [effectiveProfile]
  );

  const constraints = useMemo<OptimizationConstraintsPayload | null>(
    () => (effectiveProfile ? constraintsFromProfile(effectiveProfile) : null),
    [effectiveProfile]
  );

  const latestOutline = outlines?.[0];

  const sliderWeights = useMemo<PortfolioWeights>(() => {
    if (!hasSelection) return DEFAULT_WEIGHTS;
    if (latestOutline?.weights) return latestOutline.weights;
    if (suggestedWeights) return suggestedWeights;
    return DEFAULT_WEIGHTS;
  }, [hasSelection, latestOutline?.weights, suggestedWeights]);

  const loadedFromOutline = Boolean(latestOutline?.weights);

  const isLoading =
    hasSelection &&
    (clientLoading || portfolioLoading || profilesLoading || outlinesLoading);

  const selectPortfolio = useCallback(
    (nextClientId: number | null, nextPortfolioId: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextClientId && nextPortfolioId) {
        params.set("clientId", String(nextClientId));
        params.set("portfolioId", String(nextPortfolioId));
      } else {
        params.delete("clientId");
        params.delete("portfolioId");
      }
      const query = params.toString();
      router.replace(query ? `/portfolio?${query}` : "/portfolio");
    },
    [router, searchParams]
  );

  return {
    clientId: hasSelection ? clientId : null,
    portfolioId: hasSelection ? portfolioId : null,
    hasSelection,
    client: hasSelection ? client : undefined,
    portfolio: hasSelection ? portfolio : undefined,
    effectiveProfile,
    suggestedWeights,
    constraints,
    sliderWeights,
    loadedFromOutline,
    isLoading,
    selectPortfolio,
  };
}

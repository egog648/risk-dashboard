import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAssumptions,
  fetchDeRiskOptions,
  fetchHoldings,
  fetchLatestRun,
  fetchSellList,
  fetchTiers,
  runDeRiskAnalysis,
  updateAssumptions,
  uploadHoldings,
} from "@/lib/api/derisk";
import type { DeriskAssumptionsUpdate } from "@/types/derisk";

export function useDeRiskOptions() {
  return useQuery({
    queryKey: ["de-risk", "options"],
    queryFn: fetchDeRiskOptions,
  });
}

export function useHoldings(portfolioId: number | null) {
  return useQuery({
    queryKey: ["de-risk", "holdings", portfolioId],
    queryFn: () => fetchHoldings(portfolioId!),
    enabled: portfolioId != null,
  });
}

export function useAssumptions(portfolioId: number | null) {
  return useQuery({
    queryKey: ["de-risk", "assumptions", portfolioId],
    queryFn: () => fetchAssumptions(portfolioId!),
    enabled: portfolioId != null,
  });
}

export function useLatestRun(portfolioId: number | null) {
  return useQuery({
    queryKey: ["de-risk", "run", portfolioId],
    queryFn: () => fetchLatestRun(portfolioId!),
    enabled: portfolioId != null,
  });
}

export function useTiers(runId: number | null) {
  return useQuery({
    queryKey: ["de-risk", "tiers", runId],
    queryFn: () => fetchTiers(runId!),
    enabled: runId != null,
  });
}

export function useSellList(runId: number | null, selectedTier: number | null) {
  return useQuery({
    queryKey: ["de-risk", "sell-list", runId, selectedTier],
    queryFn: () => fetchSellList(runId!),
    enabled: runId != null,
  });
}

export function useUploadHoldings(portfolioId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadHoldings(portfolioId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["de-risk", "holdings", portfolioId] });
      qc.invalidateQueries({ queryKey: ["de-risk", "options"] });
    },
  });
}

export function useUpdateAssumptions(portfolioId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeriskAssumptionsUpdate) =>
      updateAssumptions(portfolioId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["de-risk", "assumptions", portfolioId] });
    },
  });
}

export function useRunAnalysis(portfolioId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => runDeRiskAnalysis(portfolioId!),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["de-risk", "run", portfolioId] });
      qc.invalidateQueries({ queryKey: ["de-risk", "tiers", run.id] });
      qc.invalidateQueries({ queryKey: ["de-risk", "sell-list", run.id] });
      qc.invalidateQueries({ queryKey: ["de-risk", "options"] });
    },
  });
}

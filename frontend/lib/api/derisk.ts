import { apiClient } from "./client";
import type {
  DeRiskClientPortfolioOption,
  DeriskAnalysisRun,
  DeriskAssumptions,
  DeriskAssumptionsUpdate,
  DeriskSellList,
  DeriskTiers,
  HoldingsSnapshot,
} from "@/types/derisk";

export async function fetchDeRiskOptions(): Promise<DeRiskClientPortfolioOption[]> {
  const { data } = await apiClient.get<DeRiskClientPortfolioOption[]>("/de-risk/clients");
  return data;
}

export async function fetchHoldings(portfolioId: number): Promise<HoldingsSnapshot | null> {
  const { data } = await apiClient.get<HoldingsSnapshot | null>(
    `/de-risk/portfolios/${portfolioId}/holdings`
  );
  return data;
}

export async function uploadHoldings(
  portfolioId: number,
  file: File
): Promise<HoldingsSnapshot> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<HoldingsSnapshot>(
    `/de-risk/portfolios/${portfolioId}/holdings`,
    form,
    {
      transformRequest: (payload, headers) => {
        if (headers) delete headers["Content-Type"];
        return payload;
      },
    }
  );
  return data;
}

export async function fetchAssumptions(portfolioId: number): Promise<DeriskAssumptions> {
  const { data } = await apiClient.get<DeriskAssumptions>(
    `/de-risk/portfolios/${portfolioId}/assumptions`
  );
  return data;
}

export async function updateAssumptions(
  portfolioId: number,
  payload: DeriskAssumptionsUpdate
): Promise<DeriskAssumptions> {
  const { data } = await apiClient.put<DeriskAssumptions>(
    `/de-risk/portfolios/${portfolioId}/assumptions`,
    payload
  );
  return data;
}

export async function runDeRiskAnalysis(portfolioId: number): Promise<DeriskAnalysisRun> {
  const { data } = await apiClient.post<DeriskAnalysisRun>(
    `/de-risk/portfolios/${portfolioId}/analysis`
  );
  return data;
}

export async function fetchLatestRun(portfolioId: number): Promise<DeriskAnalysisRun | null> {
  const { data } = await apiClient.get<DeriskAnalysisRun | null>(
    `/de-risk/portfolios/${portfolioId}/analysis/latest`
  );
  return data;
}

export async function fetchTiers(runId: number): Promise<DeriskTiers> {
  const { data } = await apiClient.get<DeriskTiers>(`/de-risk/analysis/${runId}/tiers`);
  return data;
}

export async function fetchSellList(runId: number): Promise<DeriskSellList> {
  const { data } = await apiClient.get<DeriskSellList>(`/de-risk/analysis/${runId}/sell-list`);
  return data;
}

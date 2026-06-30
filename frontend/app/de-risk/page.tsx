"use client";

import { useEffect, useMemo, useState } from "react";
import { FinesseHeader } from "@/components/finesse/FinesseHeader";
import { AssumptionsPanel } from "@/components/derisk/AssumptionsPanel";
import { ProtectionChart } from "@/components/derisk/ProtectionChart";
import { SellListTable } from "@/components/derisk/SellListTable";
import { TierMenu } from "@/components/derisk/TierMenu";
import { UploadZone } from "@/components/derisk/UploadZone";
import {
  useAssumptions,
  useDeRiskOptions,
  useHoldings,
  useLatestRun,
  useRunAnalysis,
  useSellList,
  useTiers,
  useUpdateAssumptions,
  useUploadHoldings,
} from "@/hooks/useDeRisk";
import { extractApiError } from "@/lib/api/errors";

export default function DeRiskPage() {
  const { data: options } = useDeRiskOptions();
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: holdings } = useHoldings(portfolioId);
  const { data: assumptions } = useAssumptions(portfolioId);
  const { data: latestRun } = useLatestRun(portfolioId);
  const runId = activeRunId ?? latestRun?.id ?? null;
  const { data: tiers } = useTiers(runId);
  const { data: sellList } = useSellList(runId, selectedTier);

  const upload = useUploadHoldings(portfolioId);
  const saveAssumptions = useUpdateAssumptions(portfolioId);
  const runAnalysis = useRunAnalysis(portfolioId);

  const grouped = useMemo(() => {
    const map = new Map<number, typeof options>();
    for (const opt of options ?? []) {
      const list = map.get(opt.client_id) ?? [];
      list.push(opt);
      map.set(opt.client_id, list);
    }
    return map;
  }, [options]);

  useEffect(() => {
    if (portfolioId == null && options?.length) {
      const first = options.find((o) => o.has_holdings) ?? options[0];
      setPortfolioId(first.portfolio_id);
    }
  }, [options, portfolioId]);

  useEffect(() => {
    if (latestRun?.id) setActiveRunId(latestRun.id);
  }, [latestRun?.id]);

  const selectedOption = options?.find((o) => o.portfolio_id === portfolioId);

  const handleSaveAndRun = async () => {
    await runAnalysis.mutateAsync();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <FinesseHeader
        title="De-Risk Analyzer"
        subtitle="Tax-aware portfolio de-risking with tiered sell recommendations"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-ff-border p-4 shadow-sm">
            <label className="text-xs font-bold uppercase text-ff-muted tracking-wide">
              Client portfolio
            </label>
            <select
              className="mt-1 w-full border border-ff-border rounded-lg px-3 py-2 text-sm"
              value={portfolioId ?? ""}
              onChange={(e) => {
                setPortfolioId(Number(e.target.value));
                setSelectedTier(null);
                setActiveRunId(null);
              }}
            >
              <option value="" disabled>
                Select a portfolio…
              </option>
              {[...grouped.entries()].map(([clientId, portfolios]) => (
                <optgroup key={clientId} label={portfolios![0].client_name}>
                  {portfolios!.map((p) => (
                    <option key={p.portfolio_id} value={p.portfolio_id}>
                      {p.portfolio_name}
                      {p.has_holdings ? " · holdings loaded" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedOption && (
              <p className="text-xs text-ff-muted mt-2">
                {holdings
                  ? `${holdings.lot_count} lots · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(holdings.total_value)} total`
                  : "No holdings snapshot — upload a statement below."}
              </p>
            )}
          </div>

          {portfolioId != null && (
            <>
              <UploadZone
                hasHoldings={!!holdings}
                isUploading={upload.isPending}
                onUpload={(file) => {
                  setUploadError(null);
                  upload.mutate(file, {
                    onError: (err: unknown) => {
                      setUploadError(
                        extractApiError(err, "Upload failed. Check the file format and try again.")
                      );
                    },
                  });
                }}
              />
              {uploadError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {uploadError}
                </p>
              )}
            </>
          )}

          {tiers && (
            <>
              <TierMenu
                tiers={tiers}
                selectedTier={selectedTier}
                onSelectTier={setSelectedTier}
              />
              <ProtectionChart tiers={tiers} />
              <SellListTable
                sellList={sellList}
                selectedTier={selectedTier}
                tierMode={tiers.tier_mode}
              />
            </>
          )}
        </div>

        <div>
          {portfolioId != null && (
            <AssumptionsPanel
              assumptions={assumptions}
              isSaving={saveAssumptions.isPending}
              isRunning={runAnalysis.isPending}
              onSave={async (payload) => {
                await saveAssumptions.mutateAsync(payload);
              }}
              onRun={handleSaveAndRun}
            />
          )}
        </div>
      </div>
    </div>
  );
}

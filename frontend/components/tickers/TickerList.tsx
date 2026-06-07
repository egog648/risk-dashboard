"use client";

import { useState } from "react";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { ObjectiveBar, OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";
import { ObjectiveBadge } from "@/components/tickers/ObjectiveBadge";
import { useDeactivateTicker, useTickers } from "@/hooks/useTickers";
import {
  ASSET_CLASS_OPTIONS,
  OBJECTIVE_OPTIONS,
  type AssetClassKind,
  type ObjectiveKind,
} from "@/types/tickers";

export function TickerList() {
  const [assetClass, setAssetClass] = useState<string>("");
  const [objective, setObjective] = useState<string>("");
  const { data, isLoading, isError } = useTickers({
    asset_class: assetClass || undefined,
    primary_objective: objective || undefined,
  });
  const deactivate = useDeactivateTicker();

  const assetLabel = (value: AssetClassKind) =>
    ASSET_CLASS_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <FinesseCard label="Vehicle Registry">
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          className="px-3 py-1.5 border border-ff-border rounded-lg text-xs bg-white text-ff-navy"
        >
          <option value="">All asset classes</option>
          {ASSET_CLASS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="px-3 py-1.5 border border-ff-border rounded-lg text-xs bg-white text-ff-navy"
        >
          <option value="">All objectives</option>
          {OBJECTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-ff-muted italic">Loading tickers...</p>}
      {isError && (
        <p className="text-sm text-red-600">Failed to load ticker registry.</p>
      )}
      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-ff-muted italic text-center py-8">
          No tickers yet. Add your first vehicle above (e.g. JEPI, VTI, BIL).
        </p>
      )}

      <div className="space-y-3">
        {data?.map((t) => (
          <div
            key={t.id}
            className="border border-[#e8edf2] rounded-lg p-3 bg-[#fafcfe]"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-ff-navy">{t.ticker}</span>
                  <ObjectiveBadge objective={t.primary_objective as ObjectiveKind} />
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{t.display_name}</p>
                <p className="text-[10px] text-ff-muted mt-1">
                  {assetLabel(t.asset_class as AssetClassKind)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deactivate.mutate(t.id)}
                disabled={deactivate.isPending}
                className="text-[10px] font-semibold text-gray-400 hover:text-red-600 shrink-0"
              >
                Remove
              </button>
            </div>
            <ObjectiveBar
              label="Growth"
              pct={t.growth_pct}
              color={OBJECTIVE_COLORS.growth}
            />
            <ObjectiveBar
              label="Income"
              pct={t.income_pct}
              color={OBJECTIVE_COLORS.income}
            />
            <ObjectiveBar
              label="Safety"
              pct={t.safety_pct}
              color={OBJECTIVE_COLORS.safety}
            />
            {t.notes && (
              <p className="text-[11px] text-ff-muted italic mt-2 border-t border-[#e8edf2] pt-2">
                {t.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </FinesseCard>
  );
}

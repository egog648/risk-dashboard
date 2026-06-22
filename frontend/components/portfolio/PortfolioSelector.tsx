"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ClientProfile } from "@/types/clients";
import type { ClientPortfolioOption } from "@/hooks/useAllClientPortfolios";

interface PortfolioSelectorProps {
  grouped: Map<string, ClientPortfolioOption[]>;
  selectedClientId: number | null;
  selectedPortfolioId: number | null;
  isLoading: boolean;
  listLoading: boolean;
  clientName?: string;
  portfolioName?: string;
  effectiveProfile?: ClientProfile | null;
  onSelect: (clientId: number | null, portfolioId: number | null) => void;
}

function selectionValue(clientId: number | null, portfolioId: number | null): string {
  if (!clientId || !portfolioId) return "";
  return `${clientId}:${portfolioId}`;
}

export function PortfolioSelector({
  grouped,
  selectedClientId,
  selectedPortfolioId,
  isLoading,
  listLoading,
  clientName,
  portfolioName,
  effectiveProfile,
  onSelect,
}: PortfolioSelectorProps) {
  const value = selectionValue(selectedClientId, selectedPortfolioId);

  const optionExists = useMemo(() => {
    if (!selectedClientId || !selectedPortfolioId) return true;
    for (const options of grouped.values()) {
      if (
        options.some(
          (option) =>
            option.clientId === selectedClientId &&
            option.portfolioId === selectedPortfolioId
        )
      ) {
        return true;
      }
    }
    return false;
  }, [grouped, selectedClientId, selectedPortfolioId]);

  const selectValue =
    selectedClientId && selectedPortfolioId ? value : "";

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (!next) {
      onSelect(null, null);
      return;
    }
    const [clientId, portfolioId] = next.split(":").map(Number);
    onSelect(clientId, portfolioId);
  };

  return (
    <div className="rounded-lg border border-ff-border bg-[#f6f9fc] p-4 space-y-2">
      <label htmlFor="portfolio-selector" className="block text-xs font-semibold text-ff-muted uppercase tracking-wide">
        Client Portfolio
      </label>
      <select
        id="portfolio-selector"
        value={selectValue}
        onChange={handleChange}
        disabled={listLoading}
        className="w-full rounded-lg border border-ff-border bg-white px-3 py-2 text-sm text-ff-navy focus:outline-none focus:ring-2 focus:ring-ff-navy/20 disabled:opacity-60"
      >
        <option value="">Manual / no portfolio</option>
        {value && !optionExists && (
          <option value={value}>
            {clientName && portfolioName
              ? `${clientName} · ${portfolioName}`
              : "Loading portfolio…"}
          </option>
        )}
        {Array.from(grouped.entries()).map(([groupName, options]) => (
          <optgroup key={groupName} label={groupName}>
            {options.map((option) => (
              <option
                key={`${option.clientId}:${option.portfolioId}`}
                value={`${option.clientId}:${option.portfolioId}`}
              >
                {option.portfolioName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {selectedClientId && selectedPortfolioId && clientName && portfolioName && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ff-text-secondary">
          <span>
            {clientName} · {portfolioName}
            {effectiveProfile && (
              <>
                {" "}
                · {effectiveProfile.risk_label} ({effectiveProfile.governed_aggression_pct}%)
              </>
            )}
          </span>
          {isLoading ? (
            <span className="text-ff-muted">Loading portfolio…</span>
          ) : (
            <Link
              href={`/clients/${selectedClientId}/portfolios/${selectedPortfolioId}`}
              className="text-ff-navy font-semibold hover:underline"
            >
              View details
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

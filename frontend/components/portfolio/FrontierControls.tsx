"use client";

import type { FrontierPoint } from "@/types/portfolio";
import { fmtPct, fmtNum } from "@/lib/utils/formatters";
import {
  PortfolioComparisonPanel,
  type SelectedPortfolio,
} from "@/components/portfolio/PortfolioComparisonPanel";

export type { SelectedPortfolio };

interface PortfolioCard {
  id: SelectedPortfolio;
  label: string;
  subtitle?: string;
  color: string;
  data: FrontierPoint | null;
}

interface FrontierControlsProps {
  maxSharpe: FrontierPoint | null;
  minVol: FrontierPoint | null;
  current: FrontierPoint | null;
  suggested?: FrontierPoint | null;
  showSuggested?: boolean;
  suggestedRiskLabel?: string;
  selected: SelectedPortfolio | null;
  onSelect: (id: SelectedPortfolio | null) => void;
  onApplyOptimized?: (point: FrontierPoint) => void;
}

/**
 * Summary cards showing Max Sharpe, Min Vol, Current, and optional Suggested portfolio stats.
 * Click a card to expand allocation details below.
 */
export function FrontierControls({
  maxSharpe,
  minVol,
  current,
  suggested = null,
  showSuggested = false,
  suggestedRiskLabel,
  selected,
  onSelect,
  onApplyOptimized,
}: FrontierControlsProps) {
  const portfolios: PortfolioCard[] = [
    { id: "max_sharpe", label: "Max Sharpe", color: "#22c55e", data: maxSharpe },
    { id: "min_vol", label: "Min Volatility", color: "#a855f7", data: minVol },
    { id: "current", label: "Current", color: "#f97316", data: current },
  ];

  if (showSuggested) {
    portfolios.push({
      id: "suggested",
      label: "Suggested",
      subtitle: suggestedRiskLabel,
      color: "#3b82f6",
      data: suggested,
    });
  }

  const handleCardClick = (id: SelectedPortfolio, hasData: boolean) => {
    if (!hasData) return;
    onSelect(selected === id ? null : id);
  };

  const selectedCard = portfolios.find((p) => p.id === selected);
  const selectedOptimized =
    selected === "max_sharpe"
      ? maxSharpe
      : selected === "min_vol"
        ? minVol
        : selected === "suggested"
          ? suggested
          : null;

  const gridClass = showSuggested
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    : "grid grid-cols-1 sm:grid-cols-3 gap-3";

  return (
    <div className="mb-4">
      <div className={gridClass}>
        {portfolios.map(({ id, label, subtitle, color, data }) => {
          const isSelected = selected === id;
          const isDisabled = !data;
          const disabledTitle =
            id === "suggested" && !data
              ? "Complete the client risk profile to see a suggestion"
              : undefined;

          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              title={disabledTitle}
              aria-pressed={isSelected}
              onClick={() => handleCardClick(id, Boolean(data))}
              className={`rounded-lg p-3 border text-left transition-all ${
                isDisabled
                  ? "bg-[#f6f9fc] border-ff-border opacity-60 cursor-not-allowed"
                  : isSelected
                    ? "border-2 bg-[#eaf1f8] cursor-pointer"
                    : "bg-[#f6f9fc] border-ff-border hover:border-[#a0b4c8] hover:bg-[#fafcfe] cursor-pointer"
              }`}
              style={{
                borderColor: isSelected ? color : isDisabled ? undefined : color + "40",
              }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color }}>
                {label}
              </div>
              {subtitle && (
                <div className="text-[10px] text-ff-muted mb-2 leading-tight">{subtitle}</div>
              )}
              {data ? (
                <>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ff-muted">Return</span>
                      <span className="text-ff-navy font-mono">
                        {fmtPct(data.expected_return)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ff-muted">Volatility</span>
                      <span className="text-ff-navy font-mono">
                        {fmtPct(data.volatility)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ff-muted">Sharpe</span>
                      <span className="text-ff-navy font-mono">{fmtNum(data.sharpe)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-ff-muted mt-2">Click to view allocation</div>
                </>
              ) : (
                <div className="text-ff-muted text-xs">
                  {id === "suggested" ? "Profile incomplete" : "Not available"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && selectedCard?.data && (
        <PortfolioComparisonPanel
          selection={selected}
          optimized={selectedOptimized}
          current={current}
          optimizedLabel={selectedCard.label}
          onApply={
            selectedOptimized && onApplyOptimized
              ? () => onApplyOptimized(selectedOptimized)
              : undefined
          }
        />
      )}
    </div>
  );
}

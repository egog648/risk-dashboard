"use client";

import type { IncomeAdequacyResult } from "@/types/portfolio";
import { fmtPct } from "@/lib/utils/formatters";

interface IncomeAdequacyPanelProps {
  income: IncomeAdequacyResult;
}

function fmtUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function IncomeAdequacyPanel({ income }: IncomeAdequacyPanelProps) {
  if (income.status === "unknown") {
    return (
      <div className="bg-[#f0f6fb] border-l-[3px] border-ff-navy px-3.5 py-2.5 rounded-r-lg text-[11px] text-[#3a5a7c] leading-snug">
        Set portfolio value and annual income need on the client portfolio page to run income
        adequacy analysis. Estimated portfolio yield:{" "}
        <strong>{fmtPct(income.portfolio_yield)}</strong> (macro proxy yields).
      </div>
    );
  }

  const shortfall = income.status === "shortfall";

  return (
    <div
      className={`border-l-[3px] px-3.5 py-2.5 rounded-r-lg text-[11px] leading-snug ${
        shortfall
          ? "bg-[#fef8f0] border-[#c0392b] text-[#8b3a2a]"
          : "bg-[#f0faf4] border-ff-green text-[#2a5d4a]"
      }`}
    >
      <div className="font-bold text-xs mb-1.5 text-ff-navy">Income Adequacy</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Est. portfolio yield</span>
          <span className="font-mono font-semibold">{fmtPct(income.portfolio_yield)}</span>
        </div>
        <div className="flex justify-between">
          <span>Est. annual income</span>
          <span className="font-mono font-semibold">
            {fmtUsd(income.annual_income_estimate)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Annual need</span>
          <span className="font-mono font-semibold">{fmtUsd(income.annual_income_need)}</span>
        </div>
        <div className="flex justify-between">
          <span>Gap</span>
          <span className="font-mono font-semibold">
            {fmtUsd(income.gap_usd)}
            {income.gap_pct != null ? ` (${income.gap_pct > 0 ? "+" : ""}${income.gap_pct}%)` : ""}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[10px] opacity-80">
        Yields are approximate macro proxies, not fund-level distributions.
      </p>
    </div>
  );
}

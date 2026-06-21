"use client";

import type { AdvisorReport as AdvisorReportData } from "@/lib/profiler/report";
import { MarketCallouts } from "./MarketCallouts";
import { VehicleSuggestions } from "./VehicleSuggestions";

interface AdvisorReportProps {
  report: AdvisorReportData | null;
}

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center py-1 text-xs">
        <span className="text-ff-text-secondary">{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="mb-2">
        <div className="w-full h-[7px] bg-[#e8edf2] rounded overflow-hidden">
          <div className="h-full rounded transition-all duration-400" style={{ width: `${value}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export function AdvisorReport({ report }: AdvisorReportProps) {
  if (!report) {
    return (
      <div className="bg-white rounded-[14px] p-5 border border-ff-border shadow-[0_2px_12px_rgba(26,58,92,0.08)]">
        <div className="text-center py-8 text-[#b0bec5] text-sm italic">
          Complete at least 10 of 12 questions to generate the Advisor Report.
        </div>
      </div>
    );
  }

  const { sleeveAllocation: sleeve } = report;

  return (
    <div className="bg-white rounded-[14px] p-5 border border-ff-border shadow-[0_2px_12px_rgba(26,58,92,0.08)] print:break-inside-avoid">
      <div className="text-sm font-extrabold text-ff-navy mb-1 flex items-center gap-2">
        <span>📋</span> Investment Advisor Report
      </div>
      <div className="text-[10px] text-ff-muted mb-0.5">
        {report.date} — Prepared for {report.clientName}
      </div>
      <div className="h-0.5 bg-gradient-to-r from-ff-navy to-ff-border my-2.5 rounded" />

      <div className="mb-4">
        <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
          Client Profile Summary
        </div>
        <div className="flex justify-between py-1 text-xs">
          <span className="text-ff-text-secondary">Investment Objective</span>
          <span className="font-bold text-ff-navy">{report.profileLabel}</span>
        </div>
        <div className="flex justify-between py-1 text-xs">
          <span className="text-ff-text-secondary">Risk Posture</span>
          <span className="font-bold text-ff-navy">{report.riskLabel} ({report.aggPct}%)</span>
        </div>
        <div className="flex justify-between py-1 text-xs">
          <span className="text-ff-text-secondary">Triangle Coordinates</span>
          <span className="font-bold text-ff-navy">
            {report.gPct}% Growth · {report.iPct}% Income · {report.sPct}% Safety
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
          Recommended Asset Allocation
        </div>
        <BarRow label="Stocks" value={sleeve.stocks} color="#2a7d5f" />
        <BarRow label="Bonds" value={sleeve.bonds} color="#2a5d9f" />
        <BarRow label="Alternatives" value={sleeve.alts} color="#7a4fa0" />
        <BarRow label="Cash / Money Market" value={sleeve.cash} color="#9f8a2a" />
      </div>

      <div className="mb-4">
        <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
          Advisor Narrative
        </div>
        <p className="text-xs text-ff-text-secondary leading-relaxed">{report.narrative}</p>
        {report.govWarning && (
          <div className="bg-[#fef8f0] border-l-[3px] border-[#c0392b] px-3.5 py-2.5 rounded-r-lg mt-2.5 text-[11px] text-[#8b3a2a] leading-snug">
            <strong>⚠ Governor Applied:</strong> {report.govWarning}
          </div>
        )}
      </div>

      <MarketCallouts sleeveAllocation={sleeve} safetyPct={report.sPct} />

      {sleeve.stocks > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
            Equity Sleeve — {sleeve.stocks}% of Portfolio
          </div>
          <div className="text-[11px] text-ff-muted mb-1.5">
            {report.passivePct}% passive / index — {report.activePct}% active / concentrated
          </div>
          <VehicleSuggestions
            sleevePct={sleeve.stocks}
            growthPct={report.gPct}
            incomePct={report.iPct}
            safetyPct={report.sPct}
            aggression={report.aggPct}
            assetClass="equities"
            color="#2a7d5f"
            fallbackVehicles={report.eqVehicles}
          />
        </div>
      )}

      {sleeve.bonds > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
            Fixed Income Sleeve — {sleeve.bonds}% of Portfolio
          </div>
          <VehicleSuggestions
            sleevePct={sleeve.bonds}
            growthPct={report.gPct}
            incomePct={report.iPct}
            safetyPct={report.sPct}
            aggression={report.aggPct}
            assetClass="credit"
            color="#2a5d9f"
            fallbackVehicles={report.bondVehicles}
          />
        </div>
      )}

      {sleeve.alts > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
            Alternatives Sleeve — {sleeve.alts}% of Portfolio
          </div>
          <VehicleSuggestions
            sleevePct={sleeve.alts}
            growthPct={report.gPct}
            incomePct={report.iPct}
            safetyPct={report.sPct}
            aggression={report.aggPct}
            assetClass="hard_assets"
            color="#7a4fa0"
            fallbackVehicles={report.altVehicles}
          />
        </div>
      )}

      {sleeve.cash > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
            Cash / Money Market — {sleeve.cash}% of Portfolio
          </div>
          <VehicleSuggestions
            sleevePct={sleeve.cash}
            growthPct={report.gPct}
            incomePct={report.iPct}
            safetyPct={report.sPct}
            aggression={report.aggPct}
            assetClass="cash"
            color="#9f8a2a"
            fallbackVehicles={report.cashVehicles}
          />
        </div>
      )}

      <div className="bg-[#f0f6fb] border-l-[3px] border-ff-navy px-3.5 py-2.5 rounded-r-lg text-[11px] text-[#3a5a7c] leading-snug">
        <strong>Disclaimer:</strong> This report is generated as a starting framework based on the
        client&apos;s questionnaire responses. It does not constitute a final investment
        recommendation. The advisor should review these suggestions in the context of the
        client&apos;s complete financial picture, tax situation, existing holdings, and any
        qualitative factors discussed during the intake meeting before implementing any portfolio
        changes.
      </div>
    </div>
  );
}

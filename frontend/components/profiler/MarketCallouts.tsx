"use client";

import { useMarketCalloutsData } from "@/hooks/useMarketCalloutsData";
import type { MarketCallout } from "@/lib/reports/buildMarketCallouts";
import type { SleeveAllocation } from "@/lib/profiler/report";

interface MarketCalloutsProps {
  sleeveAllocation: SleeveAllocation;
  safetyPct: number;
}

function CalloutBlock({ callout }: { callout: MarketCallout }) {
  const isWarn = callout.severity === "warn";
  return (
    <div
      className={`px-3.5 py-2.5 rounded-r-lg text-[11px] leading-snug ${
        isWarn
          ? "bg-[#fef8f0] border-l-[3px] border-[#c0392b] text-[#8b3a2a]"
          : "bg-[#f0f6fb] border-l-[3px] border-ff-navy text-[#3a5a7c]"
      }`}
    >
      <strong>{callout.title}:</strong> {callout.body}
    </div>
  );
}

export function MarketCallouts({ sleeveAllocation, safetyPct }: MarketCalloutsProps) {
  const { callouts, isLoading } = useMarketCalloutsData(
    sleeveAllocation,
    safetyPct,
    true
  );

  if (isLoading && callouts.length === 0) {
    return (
      <div className="mb-4 text-[11px] text-ff-muted italic">
        Loading market context…
      </div>
    );
  }

  if (callouts.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 print:break-inside-avoid">
      <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-1.5 border-b border-[#e8edf2] pb-1">
        Market Context
      </div>
      <div className="space-y-2">
        {callouts.map((callout) => (
          <CalloutBlock key={callout.id} callout={callout} />
        ))}
      </div>
    </div>
  );
}

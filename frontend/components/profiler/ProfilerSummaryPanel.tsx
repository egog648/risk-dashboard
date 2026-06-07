"use client";

import { useMemo } from "react";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { ObjectiveBar, OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";
import { TriangleChart } from "./TriangleChart";
import { AggressionGauge } from "./AggressionGauge";
import { ImplementationDetail } from "./ImplementationDetail";
import { AdvisorReport } from "./AdvisorReport";
import type { ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";
import { buildAdvisorReport } from "@/lib/profiler/report";

export interface ProfilerSummaryPanelProps {
  answers: ProfilerAnswers;
  clientName?: string;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  saveStatus?: string;
  saveError?: boolean;
  showSaveButton?: boolean;
  showResetButton?: boolean;
  showPrintButton?: boolean;
  onReset?: () => void;
}

export function ProfilerSummaryPanel({
  answers,
  clientName = "",
  onSave,
  saveLabel = "Save Profile",
  saveDisabled = false,
  saveStatus,
  saveError = false,
  showSaveButton = false,
  showResetButton = true,
  showPrintButton = true,
  onReset,
}: ProfilerSummaryPanelProps) {
  const scores = useMemo(() => computeScores(answers), [answers]);
  const report = useMemo(
    () => buildAdvisorReport(answers, clientName.trim() || "Client"),
    [answers, clientName]
  );

  const allocationBars = [
    { label: "Equities", sub: "Growth", pct: scores.g * 100, color: OBJECTIVE_COLORS.growth },
    { label: "Fixed Income", sub: "Income", pct: scores.i * 100, color: OBJECTIVE_COLORS.income },
    { label: "Cash / Money Market", sub: "Safety", pct: scores.s * 100, color: OBJECTIVE_COLORS.safety },
  ];

  return (
    <div className="max-w-[700px] mx-auto p-5 print:static print:max-w-[700px] print:mx-auto">
      {clientName.trim() && (
        <div className="text-sm font-bold text-ff-navy mb-3">{clientName.trim()}</div>
      )}

      <FinesseCard label="Portfolio Position" className="mb-4">
        <TriangleChart scores={scores} />
      </FinesseCard>

      <FinesseCard label="Aggression Dial" className="mb-4">
        <AggressionGauge scores={scores} />
      </FinesseCard>

      <FinesseCard className="mb-4">
        <div className="text-[11px] font-bold text-ff-muted uppercase tracking-wide mb-3">
          Recommended Allocation
        </div>
        {allocationBars.map((b) => (
          <ObjectiveBar key={b.label} label={b.label} sublabel={b.sub} pct={b.pct} color={b.color} />
        ))}
        <ImplementationDetail scores={scores} />
      </FinesseCard>

      <AdvisorReport report={report} />

      <div className="text-center mt-3 print:hidden">
        {showPrintButton && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-ff-navy text-white border-none rounded-lg text-xs font-semibold hover:bg-[#254d73] transition-colors"
          >
            🖨 Print Summary
          </button>
        )}
        {showSaveButton && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="inline-flex items-center gap-1.5 mt-3 ml-2 px-4 py-2 bg-ff-green text-white border-none rounded-lg text-xs font-semibold hover:bg-[#1e6049] transition-colors disabled:opacity-50"
          >
            💾 {saveLabel}
          </button>
        )}
        {showResetButton && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 mt-3 ml-2 px-4 py-2 bg-white text-ff-navy border-[1.5px] border-[#dde4ec] rounded-lg text-xs font-semibold hover:border-[#c0392b] hover:text-[#c0392b] transition-colors"
          >
            ↺ Reset
          </button>
        )}
      </div>
      {saveStatus && (
        <p
          className={`text-[11px] mt-1.5 min-h-[18px] text-center font-semibold ${saveError ? "text-[#c0392b]" : "text-ff-green"}`}
        >
          {saveStatus}
        </p>
      )}
    </div>
  );
}

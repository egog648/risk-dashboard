"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { ObjectiveBar, OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";
import { TriangleChart } from "./TriangleChart";
import { AggressionGauge } from "./AggressionGauge";
import { ImplementationDetail } from "./ImplementationDetail";
import { AdvisorReport } from "./AdvisorReport";
import { ProfilerQuestionsPrintSection } from "./ProfilerQuestionsPrintSection";
import type { ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";
import { buildAdvisorReport, formatProfilerDate } from "@/lib/profiler/report";

export interface ProfilerPrintDocumentProps {
  answers: ProfilerAnswers;
  clientName?: string;
}

export function ProfilerPrintDocument({ answers, clientName = "" }: ProfilerPrintDocumentProps) {
  const displayName = clientName.trim() || "Client";
  const [portalReady, setPortalReady] = useState(false);
  const [preparedDate, setPreparedDate] = useState<string | null>(null);

  useEffect(() => {
    setPreparedDate(formatProfilerDate());
    setPortalReady(true);
  }, []);

  const scores = useMemo(() => computeScores(answers), [answers]);
  const report = useMemo(
    () =>
      preparedDate ? buildAdvisorReport(answers, displayName, preparedDate) : null,
    [answers, displayName, preparedDate]
  );

  const allocationBars = [
    { label: "Equities", sub: "Growth", pct: scores.g * 100, color: OBJECTIVE_COLORS.growth },
    { label: "Fixed Income", sub: "Income", pct: scores.i * 100, color: OBJECTIVE_COLORS.income },
    { label: "Cash / Money Market", sub: "Safety", pct: scores.s * 100, color: OBJECTIVE_COLORS.safety },
  ];

  if (!portalReady || !preparedDate) {
    return null;
  }

  const documentContent = (
    <div className="profiler-print-root bg-white text-ff-text p-0">
      <div className="bg-ff-navy text-white px-6 py-5 border-b-[3px] border-[#2a5d8f] print:break-inside-avoid">
        <div className="text-[11px] uppercase tracking-[2.5px] text-white/70 mb-1">
          Finesse Funds
        </div>
        <h1 className="text-[20px] font-extrabold tracking-tight">
          Investment Profile &amp; Risk Questionnaire
        </h1>
        <p className="text-xs text-white/75 mt-1">
          Prepared for {displayName} — {preparedDate}
        </p>
      </div>

      <div className="p-5 max-w-[700px] mx-auto">
        <FinesseCard label="Portfolio Position" className="mb-4 shadow-none print:break-inside-avoid">
          <TriangleChart scores={scores} />
        </FinesseCard>

        <FinesseCard label="Aggression Dial" className="mb-4 shadow-none print:break-inside-avoid">
          <AggressionGauge scores={scores} />
        </FinesseCard>

        <FinesseCard className="mb-4 shadow-none print:break-inside-avoid">
          <div className="text-[11px] font-bold text-ff-muted uppercase tracking-wide mb-3">
            Recommended Allocation
          </div>
          {allocationBars.map((b) => (
            <ObjectiveBar key={b.label} label={b.label} sublabel={b.sub} pct={b.pct} color={b.color} />
          ))}
          <ImplementationDetail scores={scores} />
        </FinesseCard>

        <div className="mb-6 print:break-inside-avoid">
          <AdvisorReport report={report} />
        </div>

        <ProfilerQuestionsPrintSection answers={answers} />

        <div className="mt-8 pt-4 border-t border-[#e8edf2] print:break-inside-avoid">
          <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-2">
            Client Acknowledgment
          </div>
          <p className="text-[11px] text-ff-text-secondary leading-relaxed mb-6">
            I confirm that the questionnaire responses above accurately reflect my investment
            objectives, risk tolerance, and financial situation. I have reviewed the recommended
            profile summary and understand that this document serves as a starting framework for
            portfolio discussion with my advisor.
          </p>
          <div className="grid grid-cols-2 gap-8 text-[11px]">
            <div>
              <div className="border-b border-ff-navy pb-1 mb-1 min-h-[28px]" />
              <div className="text-ff-muted">Client Signature</div>
            </div>
            <div>
              <div className="border-b border-ff-navy pb-1 mb-1 min-h-[28px]" />
              <div className="text-ff-muted">Date</div>
            </div>
            <div>
              <div className="border-b border-ff-navy pb-1 mb-1 min-h-[28px]" />
              <div className="text-ff-muted">Advisor Signature</div>
            </div>
            <div>
              <div className="border-b border-ff-navy pb-1 mb-1 min-h-[28px]" />
              <div className="text-ff-muted">Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(documentContent, document.body);
}

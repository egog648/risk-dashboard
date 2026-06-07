"use client";

import { useMemo, useState } from "react";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { ObjectiveBar, OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";
import { ProfilerTabs } from "./ProfilerTabs";
import { QuestionBlock } from "./QuestionBlock";
import { TriangleChart } from "./TriangleChart";
import { AggressionGauge } from "./AggressionGauge";
import { ImplementationDetail } from "./ImplementationDetail";
import { AdvisorReport } from "./AdvisorReport";
import { SECTIONS, type ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";
import { buildAdvisorReport } from "@/lib/profiler/report";

export interface ProfilerWizardProps {
  clientName?: string;
  onClientNameChange?: (name: string) => void;
  initialAnswers?: ProfilerAnswers;
  onAnswersChange?: (answers: ProfilerAnswers) => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  saveStatus?: string;
  saveError?: boolean;
  showClientInput?: boolean;
  showSaveButton?: boolean;
  showResetButton?: boolean;
  showPrintButton?: boolean;
  headerSubtitle?: string;
}

export function ProfilerWizard({
  clientName = "",
  onClientNameChange,
  initialAnswers = {},
  onAnswersChange,
  onSave,
  saveLabel = "Save Profile",
  saveDisabled = false,
  saveStatus,
  saveError = false,
  showClientInput = true,
  showSaveButton = false,
  showResetButton = true,
  showPrintButton = true,
  headerSubtitle,
}: ProfilerWizardProps) {
  const [answers, setAnswers] = useState<ProfilerAnswers>(initialAnswers);
  const [activeSection, setActiveSection] = useState(0);

  const scores = useMemo(() => computeScores(answers), [answers]);
  const report = useMemo(
    () => buildAdvisorReport(answers, clientName.trim() || "Client"),
    [answers, clientName]
  );

  const handleSelect = (questionNum: number, optionIndex: number) => {
    const next = { ...answers, [questionNum]: optionIndex };
    setAnswers(next);
    onAnswersChange?.(next);
  };

  const handleReset = () => {
    setAnswers({});
    setActiveSection(0);
    onAnswersChange?.({});
    onClientNameChange?.("");
  };

  const allocationBars = [
    { label: "Equities", sub: "Growth", pct: scores.g * 100, color: OBJECTIVE_COLORS.growth },
    { label: "Fixed Income", sub: "Income", pct: scores.i * 100, color: OBJECTIVE_COLORS.income },
    { label: "Cash / Money Market", sub: "Safety", pct: scores.s * 100, color: OBJECTIVE_COLORS.safety },
  ];

  return (
    <div className="profiler-layout">
      <div className="flex flex-wrap max-w-[1100px] mx-auto">
        <div className="flex-[1_1_440px] min-w-[320px] p-5 max-h-[calc(100vh-90px)] overflow-y-auto print:hidden">
          {showClientInput && (
            <input
              type="text"
              className="w-full px-3 py-2 border-[1.5px] border-[#dde4ec] rounded-lg text-sm text-ff-navy mb-4 bg-white outline-none focus:border-ff-navy placeholder:text-[#b0bec5]"
              placeholder="Client name..."
              value={clientName}
              onChange={(e) => onClientNameChange?.(e.target.value)}
            />
          )}
          <ProfilerTabs
            activeSection={activeSection}
            counts={[scores.objAns, scores.riskAns, scores.govAns]}
            onSelect={setActiveSection}
          />
          <p className="text-xs text-ff-muted mb-4 italic">{SECTIONS[activeSection].subtitle}</p>
          {SECTIONS[activeSection].questions.map((q) => (
            <QuestionBlock
              key={q.num}
              question={q}
              selectedIndex={answers[q.num]}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="flex-[1_1_380px] min-w-[320px] p-5 sticky top-0 self-start max-h-screen overflow-y-auto print:static print:max-w-[700px] print:mx-auto">
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
            {showResetButton && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 mt-3 ml-2 px-4 py-2 bg-white text-ff-navy border-[1.5px] border-[#dde4ec] rounded-lg text-xs font-semibold hover:border-[#c0392b] hover:text-[#c0392b] transition-colors"
              >
                ↺ Reset
              </button>
            )}
          </div>
          {saveStatus && (
            <p className={`text-[11px] mt-1.5 min-h-[18px] text-center font-semibold ${saveError ? "text-[#c0392b]" : "text-ff-green"}`}>
              {saveStatus}
            </p>
          )}
        </div>
      </div>

      {headerSubtitle && (
        <p className="text-xs text-ff-muted text-center -mt-2 mb-2 print:hidden">{headerSubtitle}</p>
      )}
    </div>
  );
}

export function getProfilerProgress(answers: ProfilerAnswers): string {
  const scores = computeScores(answers);
  return `${scores.totalAns}/12 questions answered`;
}

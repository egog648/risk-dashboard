import { useEffect, useMemo, useState } from "react";
import { OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";
import type { ProfilerAnswers } from "@/lib/profiler/questions";
import {
  buildAdvisorReport,
  formatProfilerDate,
  type AdvisorReport,
} from "@/lib/profiler/report";
import { computeScores, type ProfilerScores } from "@/lib/profiler/scoring";

export interface AllocationBar {
  label: string;
  sub: string;
  pct: number;
  color: string;
}

export function useAdvisorReport(
  answers: ProfilerAnswers,
  clientName = ""
): {
  scores: ProfilerScores;
  report: AdvisorReport | null;
  reportDate: string | undefined;
  allocationBars: AllocationBar[];
  displayName: string;
} {
  const displayName = clientName.trim() || "Client";
  const [reportDate, setReportDate] = useState<string | undefined>(undefined);
  const scores = useMemo(() => computeScores(answers), [answers]);

  useEffect(() => {
    setReportDate(formatProfilerDate());
  }, []);

  const report = useMemo(
    () =>
      reportDate ? buildAdvisorReport(answers, displayName, reportDate) : null,
    [answers, displayName, reportDate]
  );

  const allocationBars = useMemo(
    (): AllocationBar[] => [
      { label: "Equities", sub: "Growth", pct: scores.g * 100, color: OBJECTIVE_COLORS.growth },
      { label: "Fixed Income", sub: "Income", pct: scores.i * 100, color: OBJECTIVE_COLORS.income },
      { label: "Cash / Money Market", sub: "Safety", pct: scores.s * 100, color: OBJECTIVE_COLORS.safety },
    ],
    [scores.g, scores.i, scores.s]
  );

  return { scores, report, reportDate, allocationBars, displayName };
}

import { answersToLetters, type ProfilerAnswers } from "./questions";
import { computeScores, getProfileLabel, getRiskLabel } from "./scoring";
import type { ClientProfileCreate } from "@/types/clients";

export function buildProfilePayload(answers: ProfilerAnswers): ClientProfileCreate | null {
  const sc = computeScores(answers);
  if (sc.totalAns < 10) return null;

  const gPct = Math.round(sc.g * 100);
  const iPct = Math.round(sc.i * 100);
  const sPct = Math.round(sc.s * 100);
  const aggPct = Math.round(sc.govAgg);

  return {
    answers: answersToLetters(answers),
    growth_pct: gPct,
    income_pct: iPct,
    safety_pct: sPct,
    raw_aggression_pct: Math.round(sc.rawAgg),
    governed_aggression_pct: aggPct,
    governor_cap_pct: sc.cap,
    profile_label: getProfileLabel(gPct, iPct, sPct),
    risk_label: getRiskLabel(aggPct),
    questions_answered: sc.totalAns,
  };
}

import {
  GOVERNOR_QUESTIONS,
  OBJECTIVE_QUESTIONS,
  RISK_QUESTIONS,
  type ProfilerAnswers,
  type RiskOption,
} from "./questions";

export interface ProfilerScores {
  g: number;
  i: number;
  s: number;
  rawAgg: number;
  govAgg: number;
  cap: number;
  objAns: number;
  riskAns: number;
  govAns: number;
  sum: number;
  totalAns: number;
}

export function computeScores(answers: ProfilerAnswers): ProfilerScores {
  let gT = 0;
  let iT = 0;
  let sT = 0;
  OBJECTIVE_QUESTIONS.forEach((q) => {
    if (answers[q.num] !== undefined) {
      const o = q.options[answers[q.num]] as { g: number; i: number; s: number };
      gT += o.g;
      iT += o.i;
      sT += o.s;
    }
  });
  const sum = gT + iT + sT;
  const g = sum > 0 ? gT / sum : 0;
  const i = sum > 0 ? iT / sum : 0;
  const s = sum > 0 ? sT / sum : 0;

  let riskSum = 0;
  let riskCount = 0;
  RISK_QUESTIONS.forEach((q) => {
    if (answers[q.num] !== undefined) {
      riskSum += (q.options[answers[q.num]] as RiskOption).score;
      riskCount++;
    }
  });
  const rawAgg = riskCount > 0 ? ((riskSum - riskCount) / (riskCount * 3)) * 100 : 0;

  let cap = 100;
  GOVERNOR_QUESTIONS.forEach((q) => {
    if (answers[q.num] !== undefined) {
      const opt = q.options[answers[q.num]] as { cap: number };
      cap = Math.min(cap, opt.cap);
    }
  });
  const govAgg = Math.min(rawAgg, cap);

  const objAns = OBJECTIVE_QUESTIONS.filter((q) => answers[q.num] !== undefined).length;
  const riskAns = riskCount;
  const govAns = GOVERNOR_QUESTIONS.filter((q) => answers[q.num] !== undefined).length;

  return {
    g,
    i,
    s,
    rawAgg,
    govAgg,
    cap,
    objAns,
    riskAns,
    govAns,
    sum,
    totalAns: objAns + riskAns + govAns,
  };
}

export function getProfileLabel(gPct: number, iPct: number, sPct: number): string {
  if (gPct >= 60) return "Growth-Oriented";
  if (iPct >= 60) return "Income-Oriented";
  if (sPct >= 60) return "Capital Preservation";
  if (gPct >= 40 && iPct >= 25) return "Growth & Income Blend";
  if (gPct >= 40 && sPct >= 25) return "Growth with Safety Cushion";
  if (iPct >= 40 && sPct >= 25) return "Income with Safety Cushion";
  return "Balanced";
}

export function getRiskLabel(aggPct: number): string {
  if (aggPct <= 20) return "Conservative";
  if (aggPct <= 40) return "Moderately Conservative";
  if (aggPct <= 60) return "Moderate";
  if (aggPct <= 80) return "Moderately Aggressive";
  return "Aggressive";
}

import type { ProfilerAnswers } from "./questions";
import { computeScores } from "./scoring";

export function getProfilerProgress(answers: ProfilerAnswers): string {
  const scores = computeScores(answers);
  return `${scores.totalAns}/12 questions answered`;
}

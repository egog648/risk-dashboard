import type { ClientProfile } from "@/types/clients";
import type { PortfolioWeights } from "@/types/portfolio";
import { lettersToAnswers } from "./questions";
import { mapToPortfolioWeights } from "./mapToPortfolioWeights";

/**
 * Derive 10-bucket optimizer weights from a saved client profile.
 */
export function mapProfileToPortfolioWeights(
  profile: ClientProfile
): PortfolioWeights | null {
  if (profile.questions_answered < 10) return null;
  return mapToPortfolioWeights(lettersToAnswers(profile.answers));
}

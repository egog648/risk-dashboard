"use client";

import { useRouter } from "next/navigation";
import type { PortfolioWeights } from "@/types/portfolio";

interface SendToOptimizerButtonProps {
  weights: PortfolioWeights;
}

const STORAGE_KEY = "risk-dashboard-prefill-weights";

export function SendToOptimizerButton({ weights }: SendToOptimizerButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    router.push("/portfolio?prefill=1");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-4 py-2 bg-ff-blue text-white text-sm font-semibold rounded-lg hover:bg-[#1e4a7a]"
    >
      Open in Optimizer →
    </button>
  );
}

/** Read prefill weights without consuming them. */
export function peekPrefillWeights(): PortfolioWeights | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortfolioWeights;
  } catch {
    return null;
  }
}

export function clearPrefillWeights(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

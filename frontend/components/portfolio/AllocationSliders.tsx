"use client";

import type { PortfolioWeights } from "@/types/portfolio";
import { WEIGHT_LABELS } from "@/types/portfolio";

interface AllocationSlidersProps {
  weights: PortfolioWeights;
  onChange: (weights: PortfolioWeights) => void;
  onRun: () => void;
  isLoading: boolean;
}

export function AllocationSliders({
  weights,
  onChange,
  onRun,
  isLoading,
}: AllocationSlidersProps) {
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  const handleChange = (key: keyof PortfolioWeights, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  return (
    <div className="space-y-3">
      {(Object.keys(weights) as Array<keyof PortfolioWeights>).map((key) => (
        <div key={key}>
          <div className="flex justify-between text-xs text-ff-muted mb-1">
            <span>{WEIGHT_LABELS[key]}</span>
            <span className="font-mono text-ff-navy">
              {(weights[key] * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(weights[key] * 100)}
            onChange={(e) => handleChange(key, Number(e.target.value) / 100)}
            className="w-full h-1.5 accent-ff-blue cursor-pointer"
          />
        </div>
      ))}

      {/* Total weight indicator */}
      <div
        className={`text-xs mt-2 ${
          Math.abs(totalWeight - 1) < 0.01
            ? "text-green-600"
            : "text-yellow-600"
        }`}
      >
        Total: {(totalWeight * 100).toFixed(0)}%
        {Math.abs(totalWeight - 1) >= 0.01 &&
          " (will be auto-normalized to 100%)"}
      </div>

      <button
        onClick={onRun}
        disabled={isLoading}
        className="w-full mt-3 py-2 px-4 bg-ff-navy hover:bg-[#254d73] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isLoading ? "Computing..." : "Run Optimizer"}
      </button>
    </div>
  );
}

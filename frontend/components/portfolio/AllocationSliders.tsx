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
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{WEIGHT_LABELS[key]}</span>
            <span className="font-mono text-gray-200">
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
            className="w-full h-1.5 accent-blue-500 cursor-pointer"
          />
        </div>
      ))}

      {/* Total weight indicator */}
      <div
        className={`text-xs mt-2 ${
          Math.abs(totalWeight - 1) < 0.01
            ? "text-green-400"
            : "text-yellow-400"
        }`}
      >
        Total: {(totalWeight * 100).toFixed(0)}%
        {Math.abs(totalWeight - 1) >= 0.01 &&
          " (will be auto-normalized to 100%)"}
      </div>

      <button
        onClick={onRun}
        disabled={isLoading}
        className="w-full mt-3 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isLoading ? "Computing..." : "Run Optimizer"}
      </button>
    </div>
  );
}

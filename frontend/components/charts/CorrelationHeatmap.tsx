"use client";

import { fmtSubClass } from "@/lib/utils/formatters";

interface CorrelationHeatmapProps {
  matrix: Record<string, Record<string, number>>;
}

function corrToColor(value: number): string {
  // -1 = deep blue, 0 = neutral gray, +1 = deep red
  if (value > 0.7) return "#ef4444";
  if (value > 0.4) return "#f97316";
  if (value > 0.1) return "#eab308";
  if (value > -0.1) return "#374151";
  if (value > -0.4) return "#3b82f6";
  return "#1d4ed8";
}

export function CorrelationHeatmap({ matrix }: CorrelationHeatmapProps) {
  const keys = Object.keys(matrix);
  if (!keys.length) return <div className="text-gray-500 text-sm">No data.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-gray-500 text-left w-28" />
            {keys.map((k) => (
              <th
                key={k}
                className="p-1 text-gray-400 font-normal text-center whitespace-nowrap"
                style={{ maxWidth: 60 }}
              >
                <span className="block truncate" style={{ maxWidth: 60 }}>
                  {fmtSubClass(k)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((rowKey) => (
            <tr key={rowKey}>
              <td className="p-1 text-gray-400 text-right pr-2 whitespace-nowrap">
                {fmtSubClass(rowKey)}
              </td>
              {keys.map((colKey) => {
                const val = matrix[rowKey]?.[colKey] ?? 0;
                return (
                  <td key={colKey} className="p-0.5">
                    <div
                      className="flex items-center justify-center rounded text-white text-xs font-mono"
                      style={{
                        backgroundColor: corrToColor(val),
                        width: 48,
                        height: 32,
                      }}
                      title={`${fmtSubClass(rowKey)} / ${fmtSubClass(colKey)}: ${val.toFixed(2)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: "#1d4ed8" }} />
        <span>-1.0</span>
        <div className="w-3 h-3 rounded" style={{ backgroundColor: "#374151" }} />
        <span>0</span>
        <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }} />
        <span>+1.0</span>
      </div>
    </div>
  );
}

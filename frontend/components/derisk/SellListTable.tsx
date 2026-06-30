"use client";

import { useMemo } from "react";
import type { DeriskSellList } from "@/types/derisk";
import { FinesseCard } from "@/components/finesse/FinesseCard";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface SellListTableProps {
  sellList: DeriskSellList | undefined;
  selectedTier: number | null;
  tierMode: "tax_budget" | "beta_target";
}

export function SellListTable({ sellList, selectedTier, tierMode }: SellListTableProps) {
  const rows = useMemo(() => {
    if (!sellList) return [];
    if (selectedTier == null) {
      return sellList.sold_lots.slice(0, 50);
    }
    return sellList.sold_lots.filter((l) => l.entry_tier <= selectedTier);
  }, [sellList, selectedTier]);

  if (!sellList) return null;

  const isTax = tierMode === "tax_budget";

  return (
    <FinesseCard title="Sell list">
      <p className="text-xs text-ff-muted mb-3">
        {selectedTier != null
          ? `Lots sold through ${isTax ? fmtUsd(selectedTier) : `β ${selectedTier}`} tier (cumulative).`
          : "Showing top lots by efficiency (select a tier to filter)."}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ff-border text-left text-ff-muted uppercase tracking-wide">
              <th className="py-2 pr-2">Ticker</th>
              <th className="py-2 pr-2">MV</th>
              <th className="py-2 pr-2">Gain</th>
              {isTax && <th className="py-2 pr-2">Tax</th>}
              <th className="py-2 pr-2">β-$ removed</th>
              {isTax && <th className="py-2">$/tax$</th>}
              <th className="py-2 pl-2">Entry tier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.ticker}-${row.trade_date}-${i}`} className="border-b border-[#f0f4f8]">
                <td className="py-2 pr-2 font-semibold text-ff-navy">{row.ticker}</td>
                <td className="py-2 pr-2">{fmtUsd(row.market_value)}</td>
                <td className="py-2 pr-2">{fmtUsd(row.unrealized_gl ?? 0)}</td>
                {isTax && <td className="py-2 pr-2">{fmtUsd(row.tax_to_sell)}</td>}
                <td className="py-2 pr-2">{fmtUsd(row.beta_dollars_removed)}</td>
                {isTax && (
                  <td className="py-2">
                    {row.exposure_per_tax_dollar != null
                      ? row.exposure_per_tax_dollar.toFixed(1)
                      : "harvest"}
                  </td>
                )}
                <td className="py-2 pl-2 text-ff-muted">
                  {isTax ? fmtUsd(row.entry_tier) : `β ${row.entry_tier}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FinesseCard>
  );
}

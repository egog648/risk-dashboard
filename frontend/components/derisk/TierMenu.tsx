"use client";

import type { DeriskTiers, TierRow } from "@/types/derisk";
import { FinesseCard } from "@/components/finesse/FinesseCard";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface TierMenuProps {
  tiers: DeriskTiers | undefined;
  selectedTier: number | null;
  onSelectTier: (tier: number | null) => void;
}

export function TierMenu({ tiers, selectedTier, onSelectTier }: TierMenuProps) {
  if (!tiers) return null;

  const { hold_all, tier_mode } = tiers;
  const isTax = tier_mode === "tax_budget";

  const tierLabel = (t: TierRow) =>
    isTax ? fmtUsd(t.budget) : `β ${(t.beta_target ?? t.budget).toFixed(2)}`;

  return (
    <div className="space-y-4">
      <FinesseCard title="Hold all (baseline)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase text-ff-muted font-bold">Total</p>
            <p className="font-semibold text-ff-navy">{fmtUsd(hold_all.total)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-ff-muted font-bold">Cash</p>
            <p className="font-semibold text-ff-navy">{fmtUsd(hold_all.cash)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-ff-muted font-bold">Beta</p>
            <p className="font-semibold text-ff-navy">{hold_all.beta_incl_cash.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-ff-muted font-bold">Runway</p>
            <p className="font-semibold text-ff-navy">{hold_all.runway_years.toFixed(1)} yrs</p>
          </div>
        </div>
      </FinesseCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tiers.tiers.map((tier) => {
          const key = tier.budget;
          const active = selectedTier === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTier(active ? null : key)}
              className={`text-left rounded-xl border p-4 transition-shadow ${
                active
                  ? "border-ff-blue bg-[#eef4fa] shadow-md"
                  : "border-ff-border bg-white hover:shadow-sm"
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-ff-muted tracking-wide">
                {isTax ? "Tax budget" : "Beta target"}
              </p>
              <p className="text-lg font-extrabold text-ff-navy mt-1">{tierLabel(tier)}</p>
              <div className="mt-3 space-y-1 text-xs text-ff-muted">
                <p>
                  β {tier.beta_before.toFixed(2)} →{" "}
                  <span className="font-semibold text-ff-navy">{tier.beta_after.toFixed(2)}</span>
                </p>
                <p>{tier.n_lots} lots · {fmtUsd(tier.proceeds)} proceeds</p>
                {isTax && <p>Tax paid: {fmtUsd(tier.gross_tax)}</p>}
                <p>Cash after: {tier.new_cash_pct.toFixed(1)}%</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

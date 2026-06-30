"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DeriskTiers } from "@/types/derisk";
import { FinesseCard } from "@/components/finesse/FinesseCard";

interface ProtectionChartProps {
  tiers: DeriskTiers | undefined;
}

export function ProtectionChart({ tiers }: ProtectionChartProps) {
  if (!tiers?.tiers.length) return null;

  const isTax = tiers.tier_mode === "tax_budget";
  const data = tiers.tiers.map((t) => ({
    name: isTax
      ? `$${(t.budget / 1000).toFixed(0)}K tax`
      : `β ${(t.beta_target ?? t.budget).toFixed(2)}`,
    tax: t.gross_tax,
    protection: t.drawdown_protection?.dd_30 ?? 0,
  }));

  return (
    <FinesseCard title="Protection vs. cost @ -30%">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Legend />
            {isTax && <Bar dataKey="tax" name="Tax paid" fill="#1a3a5c" radius={[4, 4, 0, 0]} />}
            <Bar dataKey="protection" name="Protection @-30%" fill="#2e7d32" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </FinesseCard>
  );
}

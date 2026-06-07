"use client";

import { FormEvent, useState } from "react";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { useCreateTicker } from "@/hooks/useTickers";
import {
  ASSET_CLASS_OPTIONS,
  OBJECTIVE_OPTIONS,
  type AssetClassKind,
  type CustomTickerCreate,
  type ObjectiveKind,
} from "@/types/tickers";

const DEFAULT_FORM: CustomTickerCreate = {
  ticker: "",
  display_name: "",
  asset_class: "equities",
  primary_objective: "growth",
  notes: "",
};

export function TickerForm() {
  const [form, setForm] = useState<CustomTickerCreate>(DEFAULT_FORM);
  const [advanced, setAdvanced] = useState(false);
  const [weights, setWeights] = useState({ growth: 100, income: 0, safety: 0 });
  const [error, setError] = useState<string | null>(null);
  const createTicker = useCreateTicker();

  const handlePrimaryChange = (primary: ObjectiveKind) => {
    setForm((f) => ({ ...f, primary_objective: primary }));
    if (!advanced) {
      if (primary === "growth") setWeights({ growth: 100, income: 0, safety: 0 });
      else if (primary === "income") setWeights({ growth: 0, income: 100, safety: 0 });
      else setWeights({ growth: 0, income: 0, safety: 100 });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: CustomTickerCreate = { ...form };
    if (advanced) {
      const total = weights.growth + weights.income + weights.safety;
      if (Math.abs(total - 100) > 0.01) {
        setError("Triangle weights must sum to 100%");
        return;
      }
      payload.growth_pct = weights.growth;
      payload.income_pct = weights.income;
      payload.safety_pct = weights.safety;
    }
    try {
      await createTicker.mutateAsync(payload);
      setForm(DEFAULT_FORM);
      setAdvanced(false);
      setWeights({ growth: 100, income: 0, safety: 0 });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to add ticker";
      setError(typeof msg === "string" ? msg : "Failed to add ticker");
    }
  };

  return (
    <FinesseCard label="Add Ticker">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-ff-navy">Symbol</span>
            <input
              required
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
              className="mt-1 w-full px-3 py-2 border-[1.5px] border-ff-border rounded-lg text-sm text-ff-navy focus:border-ff-navy outline-none"
              placeholder="JEPI"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ff-navy">Display name</span>
            <input
              required
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border-[1.5px] border-ff-border rounded-lg text-sm text-ff-navy focus:border-ff-navy outline-none"
              placeholder="JPMorgan Equity Premium Income ETF"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-ff-navy">Asset class</span>
            <select
              value={form.asset_class}
              onChange={(e) =>
                setForm({ ...form, asset_class: e.target.value as AssetClassKind })
              }
              className="mt-1 w-full px-3 py-2 border-[1.5px] border-ff-border rounded-lg text-sm text-ff-navy focus:border-ff-navy outline-none bg-white"
            >
              {ASSET_CLASS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-ff-navy mb-2">
              Primary objective
            </legend>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handlePrimaryChange(o.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-[1.5px] transition-colors ${
                    form.primary_objective === o.value
                      ? "border-ff-navy bg-[#eaf1f8] text-ff-navy"
                      : "border-ff-border bg-white text-ff-text-secondary hover:border-[#a0b4c8]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="flex items-center gap-2 text-xs text-ff-muted cursor-pointer">
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => setAdvanced(e.target.checked)}
          />
          Advanced: fine-tune Growth / Income / Safety weights
        </label>

        {advanced && (
          <div className="grid grid-cols-3 gap-2">
            {(["growth", "income", "safety"] as const).map((key) => (
              <label key={key} className="block">
                <span className="text-[10px] font-bold uppercase text-ff-muted">
                  {key}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights({ ...weights, [key]: Number(e.target.value) })
                  }
                  className="mt-1 w-full px-2 py-1.5 border border-ff-border rounded-lg text-sm"
                />
              </label>
            ))}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-ff-navy">Notes (optional)</span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="mt-1 w-full px-3 py-2 border-[1.5px] border-ff-border rounded-lg text-sm text-ff-navy focus:border-ff-navy outline-none resize-none"
            placeholder="Covered-call income equity, etc."
          />
        </label>

        {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={createTicker.isPending}
          className="w-full py-2.5 bg-ff-navy text-white rounded-lg text-sm font-semibold hover:bg-[#254d73] disabled:opacity-60 transition-colors"
        >
          {createTicker.isPending ? "Validating & saving..." : "Add to registry"}
        </button>
      </form>
    </FinesseCard>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { DeriskAssumptions, DeriskAssumptionsUpdate, TaxTreatment } from "@/types/derisk";
import { FinesseCard } from "@/components/finesse/FinesseCard";

const TAX_TREATMENTS: { value: TaxTreatment; label: string }[] = [
  { value: "taxable_trust", label: "Taxable trust" },
  { value: "taxable_individual", label: "Taxable individual" },
  { value: "traditional_ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "401k", label: "401(k)" },
];

interface AssumptionsPanelProps {
  assumptions: DeriskAssumptions | undefined;
  onSave: (payload: DeriskAssumptionsUpdate) => void;
  onRun: () => void;
  isSaving: boolean;
  isRunning: boolean;
}

export function AssumptionsPanel({
  assumptions,
  onSave,
  onRun,
  isSaving,
  isRunning,
}: AssumptionsPanelProps) {
  const [form, setForm] = useState<DeriskAssumptionsUpdate>({});

  useEffect(() => {
    if (!assumptions) return;
    setForm({
      tax_treatment: assumptions.tax_treatment,
      fed_ltcg: assumptions.fed_ltcg,
      fed_stcg: assumptions.fed_stcg,
      niit: assumptions.niit,
      state_rate: assumptions.state_rate,
      dd1: assumptions.dd1,
      dd2: assumptions.dd2,
      dd3: assumptions.dd3,
      dist_rate: assumptions.dist_rate,
      tax_budgets: assumptions.tax_budgets,
      beta_targets: assumptions.beta_targets,
    });
  }, [assumptions]);

  if (!assumptions) return null;

  const isTaxBudget = assumptions.tier_mode === "tax_budget";

  const field = (
    label: string,
    key: keyof DeriskAssumptionsUpdate,
    step = "0.001"
  ) => (
    <label className="block text-xs text-ff-muted mb-1">
      {label}
      <input
        type="number"
        step={step}
        className="mt-0.5 w-full border border-ff-border rounded px-2 py-1 text-sm"
        value={(form[key] as number) ?? ""}
        onChange={(e) =>
          setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))
        }
        disabled={!isTaxBudget && ["fed_ltcg", "fed_stcg", "niit", "state_rate"].includes(key)}
      />
    </label>
  );

  return (
    <FinesseCard title="Assumptions">
      <div className="space-y-3">
        <label className="block text-xs text-ff-muted">
          Tax treatment
          <select
            className="mt-0.5 w-full border border-ff-border rounded px-2 py-1 text-sm"
            value={form.tax_treatment ?? assumptions.tax_treatment}
            onChange={(e) =>
              setForm((f) => ({ ...f, tax_treatment: e.target.value as TaxTreatment }))
            }
          >
            {TAX_TREATMENTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {isTaxBudget ? (
          <div className="grid grid-cols-2 gap-2">
            {field("Fed LTCG", "fed_ltcg")}
            {field("Fed STCG", "fed_stcg")}
            {field("NIIT", "niit")}
            {field("State rate", "state_rate")}
          </div>
        ) : (
          <p className="text-xs text-ff-muted bg-[#f0f4f8] rounded p-2">
            Non-taxable account — tiers use beta-reduction targets (no tax on sells).
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {field("Drawdown 1", "dd1")}
          {field("Drawdown 2", "dd2")}
          {field("Drawdown 3", "dd3")}
        </div>
        {field("Distribution rate", "dist_rate")}

        {isTaxBudget ? (
          <label className="block text-xs text-ff-muted">
            Tax budgets (comma-separated)
            <input
              className="mt-0.5 w-full border border-ff-border rounded px-2 py-1 text-sm"
              value={(form.tax_budgets ?? assumptions.tax_budgets).join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tax_budgets: e.target.value
                    .split(",")
                    .map((s) => parseFloat(s.trim()))
                    .filter((n) => !Number.isNaN(n)),
                }))
              }
            />
          </label>
        ) : (
          <label className="block text-xs text-ff-muted">
            Beta targets (comma-separated)
            <input
              className="mt-0.5 w-full border border-ff-border rounded px-2 py-1 text-sm"
              value={(form.beta_targets ?? assumptions.beta_targets).join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  beta_targets: e.target.value
                    .split(",")
                    .map((s) => parseFloat(s.trim()))
                    .filter((n) => !Number.isNaN(n)),
                }))
              }
            />
          </label>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="flex-1 bg-ff-navy text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#254d73]"
            disabled={isSaving}
            onClick={() => onSave(form)}
          >
            {isSaving ? "Saving…" : "Save assumptions"}
          </button>
          <button
            type="button"
            className="flex-1 bg-ff-blue text-white text-sm font-semibold py-2 rounded-lg hover:opacity-90"
            disabled={isRunning}
            onClick={onRun}
          >
            {isRunning ? "Running…" : "Run analysis"}
          </button>
        </div>
      </div>
    </FinesseCard>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FinesseHeader } from "@/components/finesse/FinesseHeader";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { ObjectiveBar, OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";
import { ProfilerWizard } from "@/components/profiler/ProfilerWizard";
import { SendToOptimizerButton } from "@/components/profiler/SendToOptimizerButton";
import {
  useClient,
  useGenerateOutline,
  useOutlines,
  usePortfolio,
  useProfiles,
  useSavePortfolioProfile,
  useUpdateOutlineStatus,
} from "@/hooks/useClients";
import { useTickers } from "@/hooks/useTickers";
import { buildProfilePayload } from "@/lib/profiler/buildProfilePayload";
import { lettersToAnswers, type ProfilerAnswers } from "@/lib/profiler/questions";
import { WEIGHT_LABELS } from "@/types/portfolio";
import type { OutlineStatus } from "@/types/clients";

export default function PortfolioDetailPage() {
  const params = useParams();
  const clientId = Number(params.id);
  const portfolioId = Number(params.pid);

  const { data: client } = useClient(clientId);
  const { data: portfolio } = usePortfolio(clientId, portfolioId);
  const { data: profiles } = useProfiles(clientId);
  const { data: outlines } = useOutlines(clientId, portfolioId);
  const savePortfolioProfile = useSavePortfolioProfile(clientId, portfolioId);
  const generateOutline = useGenerateOutline(clientId, portfolioId);
  const updateStatus = useUpdateOutlineStatus(clientId, portfolioId);
  const { data: customTickers } = useTickers();

  const [showProfiler, setShowProfiler] = useState(false);
  const [answers, setAnswers] = useState<ProfilerAnswers>({});
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState(false);

  const effectiveProfile = profiles?.find((p) => p.id === portfolio?.effective_profile_id);
  const latestOutline = outlines?.[0];

  const handleSaveOverride = async () => {
    const payload = buildProfilePayload(answers);
    if (!payload) {
      setSaveStatus("Please answer at least 10 questions before saving.");
      setSaveError(true);
      return;
    }
    try {
      await savePortfolioProfile.mutateAsync(payload);
      setSaveStatus("Portfolio profile saved.");
      setSaveError(false);
      setShowProfiler(false);
    } catch {
      setSaveStatus("Failed to save profile.");
      setSaveError(true);
    }
  };

  const handleGenerateOutline = async () => {
    try {
      await generateOutline.mutateAsync();
    } catch {
      alert("Failed to generate outline. Ensure a profile is available.");
    }
  };

  const handleStatusChange = async (outlineId: number, status: OutlineStatus) => {
    await updateStatus.mutateAsync({ outlineId, status });
  };

  if (!client || !portfolio) {
    return <p className="text-sm text-ff-muted">Loading portfolio...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href={`/clients/${clientId}`} className="text-xs text-ff-muted hover:text-ff-navy">
          ← Back to {client.name}
        </Link>
      </div>

      <FinesseHeader title={portfolio.name} subtitle={`Portfolio under ${client.name}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FinesseCard title="Effective Profile" padding="lg">
          {effectiveProfile ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ff-muted">Source</span>
                <span className="font-bold text-ff-navy">
                  {portfolio.profile_override_id ? "Portfolio override" : "Client default"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Objective</span>
                <span className="font-bold text-ff-navy">{effectiveProfile.profile_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Risk</span>
                <span className="font-bold text-ff-navy">
                  {effectiveProfile.risk_label} ({effectiveProfile.governed_aggression_pct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Triangle</span>
                <span className="font-bold text-ff-navy">
                  {effectiveProfile.growth_pct}% G · {effectiveProfile.income_pct}% I ·{" "}
                  {effectiveProfile.safety_pct}% S
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ff-muted italic">
              No profile available. Save a client profile or customize for this portfolio.
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowProfiler(!showProfiler);
                if (effectiveProfile) {
                  setAnswers(lettersToAnswers(effectiveProfile.answers));
                }
              }}
              className="px-4 py-2 bg-ff-navy text-white text-sm font-semibold rounded-lg hover:bg-[#254d73]"
            >
              {showProfiler ? "Hide Profiler" : "Customize for this Portfolio"}
            </button>
            <button
              type="button"
              onClick={handleGenerateOutline}
              disabled={!effectiveProfile || generateOutline.isPending}
              className="px-4 py-2 bg-ff-green text-white text-sm font-semibold rounded-lg hover:bg-[#1e6049] disabled:opacity-50"
            >
              {generateOutline.isPending ? "Generating..." : "Generate Outline"}
            </button>
          </div>
        </FinesseCard>

        {latestOutline && (
          <FinesseCard title="Latest Outline" padding="lg">
            <div className="space-y-1 mb-3">
              <ObjectiveBar
                label="Stocks"
                pct={latestOutline.sleeve_allocation.stocks}
                color={OBJECTIVE_COLORS.growth}
              />
              <ObjectiveBar
                label="Bonds"
                pct={latestOutline.sleeve_allocation.bonds}
                color={OBJECTIVE_COLORS.income}
              />
              <ObjectiveBar
                label="Alternatives"
                pct={latestOutline.sleeve_allocation.alts}
                color="#7a4fa0"
              />
              <ObjectiveBar
                label="Cash"
                pct={latestOutline.sleeve_allocation.cash}
                color={OBJECTIVE_COLORS.safety}
              />
            </div>
            <p className="text-xs text-ff-text-secondary leading-relaxed mb-3">
              {latestOutline.narrative}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-ff-muted">Status:</span>
              {(["draft", "presented", "implemented"] as OutlineStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(latestOutline.id, s)}
                  className={`px-2 py-0.5 text-xs rounded border ${
                    latestOutline.status === s
                      ? "bg-ff-navy text-white border-ff-navy"
                      : "border-ff-border text-ff-muted hover:border-ff-navy"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <SendToOptimizerButton weights={latestOutline.weights} />
            </div>
          </FinesseCard>
        )}
      </div>

      {showProfiler && (
        <div className="mb-8 -mx-6">
          <ProfilerWizard
            key={`portfolio-profiler-${effectiveProfile?.id ?? "new"}-${showProfiler}`}
            clientName={client.name}
            initialAnswers={answers}
            onAnswersChange={setAnswers}
            showClientInput={false}
            showSaveButton
            onSave={handleSaveOverride}
            saveLabel="Save Portfolio Override"
            saveDisabled={savePortfolioProfile.isPending}
            saveStatus={saveStatus}
            saveError={saveError}
          />
        </div>
      )}

      {latestOutline && (
        <FinesseCard title="10-Bucket Weights" padding="lg" className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {(Object.keys(WEIGHT_LABELS) as (keyof typeof WEIGHT_LABELS)[]).map((key) => (
              <div key={key} className="flex justify-between py-1 border-b border-[#e8edf2]">
                <span className="text-ff-text-secondary">{WEIGHT_LABELS[key]}</span>
                <span className="font-bold text-ff-navy">
                  {Math.round(latestOutline.weights[key] * 100)}%
                </span>
              </div>
            ))}
          </div>
        </FinesseCard>
      )}

      {latestOutline && Object.keys(latestOutline.vehicles).length > 0 && (
        <FinesseCard title="Suggested Vehicles" padding="lg" className="mb-8">
          {Object.entries(latestOutline.vehicles).map(([sleeve, vehicles]) => (
            <div key={sleeve} className="mb-4">
              <h4 className="text-xs font-bold text-ff-navy uppercase mb-2">{sleeve}</h4>
              {vehicles.map((v) => (
                <div key={v.name} className="flex justify-between text-xs py-1">
                  <span className="text-ff-text-secondary">{v.name}</span>
                  <span className="font-bold text-ff-navy">{v.pct}%</span>
                </div>
              ))}
            </div>
          ))}
        </FinesseCard>
      )}

      {customTickers && customTickers.length > 0 && effectiveProfile && (
        <FinesseCard title="Custom Ticker Matches" padding="lg" className="mb-8">
          <p className="text-xs text-ff-muted mb-3">
            Vehicles from your registry that align with this profile&apos;s objectives.
          </p>
          <div className="space-y-2">
            {customTickers
              .filter((t) => {
                const g = effectiveProfile.growth_pct;
                const i = effectiveProfile.income_pct;
                const s = effectiveProfile.safety_pct;
                if (t.primary_objective === "growth" && g >= 30) return true;
                if (t.primary_objective === "income" && i >= 30) return true;
                if (t.primary_objective === "safety" && s >= 30) return true;
                return false;
              })
              .map((t) => (
                <div key={t.id} className="flex justify-between text-xs py-1 border-b border-[#e8edf2]">
                  <span>
                    <span className="font-bold text-ff-navy">{t.ticker}</span> — {t.display_name}
                  </span>
                  <span className="text-ff-muted capitalize">{t.primary_objective}</span>
                </div>
              ))}
          </div>
        </FinesseCard>
      )}

      {outlines && outlines.length > 1 && (
        <FinesseCard title="Outline History" padding="lg">
          {outlines.slice(1).map((o) => (
            <div key={o.id} className="text-xs py-2 border-b border-[#e8edf2] last:border-0">
              {new Date(o.created_at).toLocaleString()} — {o.status} —{" "}
              {o.sleeve_allocation.stocks}% stocks / {o.sleeve_allocation.bonds}% bonds
            </div>
          ))}
        </FinesseCard>
      )}
    </div>
  );
}

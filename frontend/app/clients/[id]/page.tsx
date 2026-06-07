"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FinesseHeader } from "@/components/finesse/FinesseHeader";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { ProfilerWizard } from "@/components/profiler/ProfilerWizard";
import { SaveProfileBar } from "@/components/profiler/SaveProfileBar";
import {
  useClient,
  useCreatePortfolio,
  usePortfolios,
  useProfiles,
  useSaveClientProfile,
} from "@/hooks/useClients";
import { exportProfilesCSV } from "@/components/profiler/ImportProfilesButton";
import { buildProfilePayload } from "@/lib/profiler/buildProfilePayload";
import { lettersToAnswers, type ProfilerAnswers } from "@/lib/profiler/questions";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = Number(params.id);
  const { data: client } = useClient(clientId);
  const { data: portfolios } = usePortfolios(clientId);
  const { data: profiles } = useProfiles(clientId);
  const saveProfile = useSaveClientProfile(clientId);
  const createPortfolio = useCreatePortfolio(clientId);

  const [showProfiler, setShowProfiler] = useState(false);
  const [answers, setAnswers] = useState<ProfilerAnswers>({});
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [portfolioName, setPortfolioName] = useState("");

  const currentProfile = profiles?.find((p) => p.is_current && !p.is_portfolio_override);

  const handleSaveProfile = async () => {
    const payload = buildProfilePayload(answers);
    if (!payload) {
      setSaveStatus("Please answer at least 10 questions before saving.");
      setSaveError(true);
      return;
    }
    try {
      await saveProfile.mutateAsync(payload);
      setSaveStatus("Profile saved successfully.");
      setSaveError(false);
      setShowProfiler(false);
    } catch {
      setSaveStatus("Failed to save profile.");
      setSaveError(true);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioName.trim()) return;
    await createPortfolio.mutateAsync({ name: portfolioName.trim() });
    setPortfolioName("");
  };

  if (!client) {
    return <p className="text-sm text-ff-muted">Loading client...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/clients" className="text-xs text-ff-muted hover:text-ff-navy">
          ← Back to Clients
        </Link>
      </div>

      <FinesseHeader title={client.name} subtitle="Client workspace" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FinesseCard title="Default Profile" padding="lg">
          {currentProfile ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ff-muted">Objective</span>
                <span className="font-bold text-ff-navy">{currentProfile.profile_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Risk</span>
                <span className="font-bold text-ff-navy">
                  {currentProfile.risk_label} ({currentProfile.governed_aggression_pct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Triangle</span>
                <span className="font-bold text-ff-navy">
                  {currentProfile.growth_pct}% G · {currentProfile.income_pct}% I ·{" "}
                  {currentProfile.safety_pct}% S
                </span>
              </div>
              <p className="text-xs text-ff-muted pt-1">
                Saved {new Date(currentProfile.saved_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ff-muted italic">No profile yet. Run the profiler below.</p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowProfiler(!showProfiler);
                if (currentProfile) {
                  setAnswers(lettersToAnswers(currentProfile.answers));
                }
              }}
              className="px-4 py-2 bg-ff-navy text-white text-sm font-semibold rounded-lg hover:bg-[#254d73]"
            >
              {showProfiler ? "Hide Profiler" : currentProfile ? "Update Profile" : "Run Profiler"}
            </button>
            {showProfiler && (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saveProfile.isPending}
                className="px-4 py-2 bg-ff-green text-white text-sm font-semibold rounded-lg hover:bg-[#1e6049] disabled:opacity-50"
              >
                {saveProfile.isPending ? "Saving..." : "💾 Save Profile"}
              </button>
            )}
          </div>
          {showProfiler && saveStatus && (
            <p
              className={`text-xs mt-2 font-semibold ${saveError ? "text-[#c0392b]" : "text-ff-green"}`}
            >
              {saveStatus}
            </p>
          )}
        </FinesseCard>

        <FinesseCard title="Add Portfolio" padding="lg">
          <form onSubmit={handleAddPortfolio} className="space-y-3">
            <input
              type="text"
              placeholder="Portfolio name (e.g. Roth IRA, Taxable)"
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              className="w-full px-3 py-2 border border-ff-border rounded-lg text-sm focus:border-ff-navy outline-none"
            />
            <button
              type="submit"
              disabled={createPortfolio.isPending || !portfolioName.trim()}
              className="px-4 py-2 bg-ff-green text-white text-sm font-semibold rounded-lg hover:bg-[#1e6049] disabled:opacity-50"
            >
              {createPortfolio.isPending ? "Adding..." : "Add Portfolio"}
            </button>
          </form>
        </FinesseCard>
      </div>

      {showProfiler && (
        <div className="mb-8 -mx-6">
          <div className="px-5">
            <SaveProfileBar
              answers={answers}
              onSave={handleSaveProfile}
              isSaving={saveProfile.isPending}
              saveStatus={saveStatus}
              saveError={saveError}
              saveLabel="Save Client Profile"
              clientName={client.name}
              hint="Complete the questionnaire, then save to this client's record"
            />
          </div>
          <ProfilerWizard
            key={`client-profiler-${currentProfile?.id ?? "new"}-${showProfiler}`}
            clientName={client.name}
            initialAnswers={answers}
            onAnswersChange={setAnswers}
            showClientInput={false}
            showSaveButton
            onSave={handleSaveProfile}
            saveLabel="Save Client Profile"
            saveDisabled={saveProfile.isPending}
            saveStatus={saveStatus}
            saveError={saveError}
          />
        </div>
      )}

      <FinesseCard title="Portfolios" padding="lg" className="mb-8">
        {portfolios?.length === 0 && (
          <p className="text-sm text-ff-muted italic text-center py-4">
            No portfolios yet. Add a portfolio above.
          </p>
        )}
        <div className="space-y-2">
          {portfolios?.map((p) => (
            <Link
              key={p.id}
              href={`/clients/${clientId}/portfolios/${p.id}`}
              className="block px-3 py-2.5 rounded-lg border border-[#e8edf2] hover:border-ff-navy hover:bg-[#f6f9fc] transition-colors"
            >
              <div className="font-bold text-ff-navy text-sm">{p.name}</div>
              <div className="text-xs text-ff-muted mt-0.5">
                {p.profile_override_id ? "Custom profile" : "Uses client default profile"}
                {p.effective_profile_id ? "" : " · No profile available"}
              </div>
            </Link>
          ))}
        </div>
      </FinesseCard>

      {profiles && profiles.length > 0 && (
        <FinesseCard title="Saved Profiles" padding="lg">
          <button
            type="button"
            onClick={() =>
              exportProfilesCSV(
                profiles.map((p) => ({
                  savedAt: p.saved_at,
                  clientName: client.name,
                  profileLabel: p.profile_label,
                  riskLabel: p.risk_label,
                  growthPct: p.growth_pct,
                  incomePct: p.income_pct,
                  safetyPct: p.safety_pct,
                  rawAggressionPct: p.raw_aggression_pct,
                  governedAggressionPct: p.governed_aggression_pct,
                  governorCapPct: p.governor_cap_pct,
                  questionsAnswered: p.questions_answered,
                  answers: p.answers,
                }))
              )
            }
            className="mb-3 px-3 py-1.5 text-xs font-semibold bg-ff-blue text-white rounded-lg hover:bg-[#1e4a7a]"
          >
            Export CSV
          </button>
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="px-3 py-2 rounded-lg border border-[#e8edf2] text-xs">
                <div className="font-bold text-ff-navy">
                  {p.is_portfolio_override ? "Portfolio Override" : "Client Default"}
                  {p.is_current && !p.is_portfolio_override && (
                    <span className="ml-2 text-ff-green font-normal">(current)</span>
                  )}
                </div>
                <div className="text-ff-muted mt-0.5">
                  {new Date(p.saved_at).toLocaleDateString()} — {p.profile_label} — {p.risk_label} —{" "}
                  {p.growth_pct}% G / {p.income_pct}% I / {p.safety_pct}% S
                </div>
              </div>
            ))}
          </div>
        </FinesseCard>
      )}
    </div>
  );
}

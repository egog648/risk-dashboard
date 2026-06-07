"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClientSearchInput } from "@/components/profiler/ClientSearchInput";
import { ImportProfilesButton } from "@/components/profiler/ImportProfilesButton";
import { ProfilerWizard, getProfilerProgress } from "@/components/profiler/ProfilerWizard";
import { SaveProfileBar } from "@/components/profiler/SaveProfileBar";
import { useClients, useCreateClient, useProfiles } from "@/hooks/useClients";
import { saveClientProfile } from "@/lib/api/clients";
import { buildProfilePayload } from "@/lib/profiler/buildProfilePayload";
import { lettersToAnswers, type ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";
import type { Client } from "@/types/clients";

export default function ProfilerPage() {
  const router = useRouter();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const createClient = useCreateClient();

  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [answers, setAnswers] = useState<ProfilerAnswers>({});
  const [wizardKey, setWizardKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState(false);

  const { data: profiles } = useProfiles(
    typeof selectedClientId === "number" ? selectedClientId : 0
  );
  const lastLoadedClientRef = useRef<number | "">("");

  // Load existing profile when a client is selected from search
  useEffect(() => {
    if (!selectedClientId || !profiles) return;
    if (lastLoadedClientRef.current === selectedClientId) return;
    lastLoadedClientRef.current = selectedClientId;

    const current = profiles.find((p) => p.is_current && !p.is_portfolio_override);
    if (current) {
      setAnswers(lettersToAnswers(current.answers));
      setWizardKey((k) => k + 1);
      setSaveStatus(
        `Loaded profile from ${new Date(current.saved_at).toLocaleDateString()}. Edit and save to update.`
      );
      setSaveError(false);
    } else {
      setAnswers({});
      setWizardKey((k) => k + 1);
      setSaveStatus("No saved profile for this client yet — complete the questionnaire and save.");
      setSaveError(false);
    }
  }, [selectedClientId, profiles]);

  const handleSelectClient = (client: Client | null) => {
    if (client) {
      lastLoadedClientRef.current = "";
      setSelectedClientId(client.id);
      setClientName(client.name);
    } else {
      lastLoadedClientRef.current = "";
      setSelectedClientId("");
    }
  };

  const handleSave = async () => {
    const payload = buildProfilePayload(answers);
    if (!payload) {
      setSaveStatus("Please answer at least 10 questions before saving.");
      setSaveError(true);
      return;
    }

    setIsSaving(true);
    try {
      let clientId = selectedClientId;
      if (!clientId) {
        const name = clientName.trim();
        if (!name) {
          setSaveStatus("Select an existing client or enter a name.");
          setSaveError(true);
          setIsSaving(false);
          return;
        }
        const created = await createClient.mutateAsync({ name });
        clientId = created.id;
        setSelectedClientId(created.id);
      }

      await saveClientProfile(clientId, payload);
      const name =
        clientName.trim() || clients?.find((c) => c.id === clientId)?.name || "client";
      setSaveStatus(`Profile saved for ${name}.`);
      setSaveError(false);
      router.push(`/clients/${clientId}`);
    } catch {
      setSaveStatus("Failed to save profile. Is the backend running?");
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="bg-ff-navy text-white px-7 py-5 -mx-6 -mt-6 mb-0 border-b-[3px] border-[#2a5d8f] print:hidden">
        <p className="text-[11px] uppercase tracking-[2.5px] opacity-55 mb-1">Finesse Funds</p>
        <h1 className="text-[22px] font-extrabold tracking-tight">Investment Profile Scorer</h1>
        <p className="text-xs opacity-45 mt-0.5">{getProfilerProgress(answers)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ImportProfilesButton
            onImport={(name, imported) => {
              setClientName(name);
              setSelectedClientId("");
              setAnswers(imported);
              setWizardKey((k) => k + 1);
            }}
          />
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4 max-w-[1100px] mx-auto">
        <div className="bg-white border border-ff-border rounded-[14px] p-4 shadow-[0_2px_12px_rgba(26,58,92,0.08)]">
          <ClientSearchInput
            clients={clients ?? []}
            value={clientName}
            selectedClientId={selectedClientId}
            onChange={(name) => {
              setClientName(name);
              if (!name.trim()) setSelectedClientId("");
            }}
            onSelectClient={handleSelectClient}
            isLoading={clientsLoading}
          />
        </div>

        <SaveProfileBar
          answers={answers}
          onSave={handleSave}
          isSaving={isSaving || createClient.isPending}
          saveStatus={saveStatus}
          saveError={saveError}
          saveLabel="Save Profile"
          clientName={clientName}
          selectedClientId={selectedClientId}
        />
      </div>

      <ProfilerWizard
        key={wizardKey}
        clientName={clientName}
        onClientNameChange={setClientName}
        initialAnswers={answers}
        onAnswersChange={setAnswers}
        showClientInput={false}
        showSaveButton
        onSave={handleSave}
        saveLabel="Save Profile"
        saveDisabled={isSaving || createClient.isPending}
        saveStatus={saveStatus}
        saveError={saveError}
      />

      {/* Sticky save bar — always visible while scrolling */}
      <div className="fixed bottom-0 left-52 right-0 z-40 bg-white border-t-2 border-ff-navy/20 px-6 py-3 shadow-[0_-4px_16px_rgba(26,58,92,0.1)] print:hidden">
        <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-bold text-ff-navy">
              {clientName.trim() || "No client selected"}
            </span>
            <span className="text-ff-muted ml-2">{getProfilerProgress(answers)}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              createClient.isPending ||
              computeScores(answers).totalAns < 10 ||
              (!selectedClientId && !clientName.trim())
            }
            className="px-6 py-2.5 bg-ff-green text-white rounded-lg text-sm font-bold hover:bg-[#1e6049] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving || createClient.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

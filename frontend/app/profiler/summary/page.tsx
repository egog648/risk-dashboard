"use client";

import { useCreateClient } from "@/hooks/useClients";
import { useProfilerContext } from "@/components/profiler/ProfilerContext";
import { ProfilerSummaryPanel } from "@/components/profiler/ProfilerSummaryPanel";

export default function ProfilerSummaryPage() {
  const createClient = useCreateClient();
  const {
    answers,
    clientName,
    isSaving,
    saveStatus,
    saveError,
    handleSave,
    handleReset,
    wizardKey,
  } = useProfilerContext();

  return (
    <ProfilerSummaryPanel
      key={wizardKey}
      answers={answers}
      clientName={clientName}
      onSave={handleSave}
      saveLabel="Save Profile"
      saveDisabled={isSaving || createClient.isPending}
      saveStatus={saveStatus}
      saveError={saveError}
      showSaveButton
      showResetButton
      onReset={handleReset}
    />
  );
}

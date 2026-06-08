"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ClientSearchInput } from "@/components/profiler/ClientSearchInput";
import {
  ProfilerProvider,
  useProfilerContext,
  useProfilerSaveDisabled,
} from "@/components/profiler/ProfilerContext";
import { ProfilerRibbon } from "@/components/profiler/ProfilerRibbon";
import { SaveProfileBar } from "@/components/profiler/SaveProfileBar";
import { getProfilerProgress } from "@/lib/profiler/progress";
import { useCreateClient } from "@/hooks/useClients";

function ProfilerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const createClient = useCreateClient();
  const saveDisabled = useProfilerSaveDisabled();
  const {
    clientName,
    setClientName,
    setSelectedClientId,
    selectedClientId,
    answers,
    isSaving,
    saveStatus,
    saveError,
    clientsLoading,
    clients,
    handleSelectClient,
    handleSave,
    handleImport,
  } = useProfilerContext();

  const activeView = pathname === "/profiler/summary" ? "summary" : "questions";
  const sectionParam = searchParams.get("section");
  const activeSection = Math.min(
    Math.max(parseInt(sectionParam ?? "0", 10) || 0, 0),
    2
  );

  return (
    <div className="pb-24">
      <ProfilerRibbon
        answers={answers}
        activeSection={activeSection}
        activeView={activeView}
        onImport={handleImport}
      />

      <div className="px-5 pt-4 space-y-4 max-w-[1100px] mx-auto print:hidden">
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

      {children}

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
            disabled={saveDisabled}
            className="px-6 py-2.5 bg-ff-green text-white rounded-lg text-sm font-bold hover:bg-[#1e6049] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving || createClient.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfilerProvider>
      <Suspense
        fallback={
          <div className="pb-24">
            <div className="bg-ff-navy text-white px-7 py-5 -mx-6 -mt-6 animate-pulse h-32" />
          </div>
        }
      >
        <ProfilerLayoutContent>{children}</ProfilerLayoutContent>
      </Suspense>
    </ProfilerProvider>
  );
}

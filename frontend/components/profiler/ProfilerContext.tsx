"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useClients, useCreateClient, useProfiles } from "@/hooks/useClients";
import { saveClientProfile } from "@/lib/api/clients";
import { buildProfilePayload } from "@/lib/profiler/buildProfilePayload";
import { lettersToAnswers, type ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";
import type { Client } from "@/types/clients";

interface ProfilerContextValue {
  clientName: string;
  setClientName: (name: string) => void;
  selectedClientId: number | "";
  setSelectedClientId: (id: number | "") => void;
  answers: ProfilerAnswers;
  setAnswers: (answers: ProfilerAnswers) => void;
  wizardKey: number;
  bumpWizardKey: () => void;
  isSaving: boolean;
  saveStatus: string;
  saveError: boolean;
  clientsLoading: boolean;
  clients: Client[] | undefined;
  handleSelectClient: (client: Client | null) => void;
  handleSave: () => Promise<void>;
  handleImport: (name: string, imported: ProfilerAnswers) => void;
  handleReset: () => void;
}

const ProfilerContext = createContext<ProfilerContextValue | null>(null);

const PROFILER_DRAFT_STORAGE_KEY = "risk-dashboard-profiler-draft";

interface ProfilerDraft {
  answers: ProfilerAnswers;
  clientName: string;
  selectedClientId: number | "";
}

function loadProfilerDraft(): ProfilerDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PROFILER_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfilerDraft;
  } catch {
    return null;
  }
}

function saveProfilerDraft(draft: ProfilerDraft) {
  if (typeof window === "undefined") return;
  if (Object.keys(draft.answers).length === 0 && !draft.clientName.trim()) {
    sessionStorage.removeItem(PROFILER_DRAFT_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(PROFILER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function ProfilerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const createClient = useCreateClient();

  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [answers, setAnswers] = useState<ProfilerAnswers>({});
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState(false);

  const { data: profiles } = useProfiles(
    typeof selectedClientId === "number" ? selectedClientId : 0
  );
  const lastLoadedClientRef = useRef<number | "">("");

  useEffect(() => {
    const draft = loadProfilerDraft();
    if (draft) {
      setAnswers(draft.answers);
      setClientName(draft.clientName);
      setSelectedClientId(draft.selectedClientId);
      setWizardKey((k) => k + 1);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    saveProfilerDraft({ answers, clientName, selectedClientId });
  }, [answers, clientName, selectedClientId, draftHydrated]);

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

  const handleSelectClient = useCallback((client: Client | null) => {
    if (client) {
      lastLoadedClientRef.current = "";
      setSelectedClientId(client.id);
      setClientName(client.name);
    } else {
      lastLoadedClientRef.current = "";
      setSelectedClientId("");
    }
  }, []);

  const handleSave = useCallback(async () => {
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
  }, [answers, selectedClientId, clientName, createClient, clients, router]);

  const handleImport = useCallback((name: string, imported: ProfilerAnswers) => {
    setClientName(name);
    setSelectedClientId("");
    setAnswers(imported);
    setWizardKey((k) => k + 1);
  }, []);

  const handleReset = useCallback(() => {
    setAnswers({});
    setWizardKey((k) => k + 1);
    setClientName("");
    setSelectedClientId("");
    lastLoadedClientRef.current = "";
    setSaveStatus("");
    setSaveError(false);
    sessionStorage.removeItem(PROFILER_DRAFT_STORAGE_KEY);
  }, []);

  const bumpWizardKey = useCallback(() => setWizardKey((k) => k + 1), []);

  return (
    <ProfilerContext.Provider
      value={{
        clientName,
        setClientName,
        selectedClientId,
        setSelectedClientId,
        answers,
        setAnswers,
        wizardKey,
        bumpWizardKey,
        isSaving,
        saveStatus,
        saveError,
        clientsLoading,
        clients,
        handleSelectClient,
        handleSave,
        handleImport,
        handleReset,
      }}
    >
      {children}
    </ProfilerContext.Provider>
  );
}

export function useProfilerContext(): ProfilerContextValue {
  const ctx = useContext(ProfilerContext);
  if (!ctx) {
    throw new Error("useProfilerContext must be used within ProfilerProvider");
  }
  return ctx;
}

export function useProfilerSaveDisabled(): boolean {
  const { answers, selectedClientId, clientName, isSaving } = useProfilerContext();
  const createClient = useCreateClient();
  return (
    isSaving ||
    createClient.isPending ||
    computeScores(answers).totalAns < 10 ||
    (!selectedClientId && !clientName.trim())
  );
}

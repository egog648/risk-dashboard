"use client";

import Link from "next/link";
import type { ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";

interface SaveProfileBarProps {
  answers: ProfilerAnswers;
  onSave: () => void;
  isSaving?: boolean;
  saveStatus?: string;
  saveError?: boolean;
  saveLabel?: string;
  clientName?: string;
  hint?: string;
  selectedClientId?: number | "";
}

export function SaveProfileBar({
  answers,
  onSave,
  isSaving = false,
  saveStatus,
  saveError = false,
  saveLabel = "Save Profile",
  clientName,
  hint,
  selectedClientId,
}: SaveProfileBarProps) {
  const scores = computeScores(answers);
  const hasClient = Boolean(selectedClientId) || Boolean(clientName?.trim());
  const canSave = scores.totalAns >= 10 && hasClient;

  let disabledReason = "";
  if (scores.totalAns < 10) disabledReason = `Answer ${10 - scores.totalAns} more question(s)`;
  else if (!hasClient) disabledReason = "Select or enter a client name";

  return (
    <div className="bg-white border-2 border-ff-navy/20 rounded-[14px] px-5 py-4 shadow-[0_2px_12px_rgba(26,58,92,0.12)] print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ff-navy">
            {clientName ? `Save profile for ${clientName}` : "Save client profile"}
          </p>
          <p className="text-xs text-ff-muted mt-0.5">
            {hint ?? `${scores.totalAns}/12 questions answered`}
            {!canSave && disabledReason && ` — ${disabledReason}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !canSave}
          title={!canSave ? disabledReason : undefined}
          className="inline-flex items-center gap-1.5 px-6 py-3 bg-ff-green text-white border-2 border-ff-green rounded-lg text-sm font-bold hover:bg-[#1e6049] hover:border-[#1e6049] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
      </div>
      {saveStatus && (
        <p
          className={`text-xs mt-2 font-semibold ${saveError ? "text-[#c0392b]" : "text-ff-green"}`}
        >
          {saveStatus}
          {!saveError && selectedClientId && (
            <>
              {" "}
              <Link href={`/clients/${selectedClientId}`} className="underline text-ff-navy">
                View client →
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}

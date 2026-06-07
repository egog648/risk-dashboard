"use client";

import { lettersToAnswers } from "@/lib/profiler/questions";
import type { ProfilerAnswers } from "@/lib/profiler/questions";

interface StoredProfile {
  clientName?: string;
  answers?: Record<string, string>;
}

interface ImportProfilesButtonProps {
  onImport: (clientName: string, answers: ProfilerAnswers) => void;
}

export function ImportProfilesButton({ onImport }: ImportProfilesButtonProps) {
  const handleImport = () => {
    try {
      const raw = localStorage.getItem("finesseProfiles");
      if (!raw) {
        alert("No saved profiles found in localStorage.");
        return;
      }
      const profiles: StoredProfile[] = JSON.parse(raw);
      if (!profiles.length) {
        alert("No saved profiles found.");
        return;
      }
      const latest = profiles[0];
      if (!latest.answers) {
        alert("Profile has no answer data.");
        return;
      }
      onImport(latest.clientName || "", lettersToAnswers(latest.answers));
    } catch {
      alert("Failed to import from localStorage.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleImport}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-ff-blue text-white text-sm font-semibold rounded-lg hover:bg-[#1e4a7a]"
    >
      Import from HTML Profiler
    </button>
  );
}

export function exportProfilesCSV(profiles: Array<Record<string, unknown>>) {
  if (!profiles.length) return;
  const headers = [
    "savedAt", "clientName", "profileLabel", "riskLabel",
    "growthPct", "incomePct", "safetyPct", "rawAggressionPct",
    "governedAggressionPct", "governorCapPct", "questionsAnswered",
    "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12",
  ];
  const rows = profiles.map((p) =>
    headers.map((h) => {
      if (/^q\d+$/.test(h)) {
        const answers = p.answers as Record<string, string> | undefined;
        return answers?.[h] ?? "";
      }
      return p[h] !== undefined ? String(p[h]) : "";
    })
  );
  const csv = [headers, ...rows]
    .map((r) =>
      r
        .map((v) => {
          const s = String(v);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `finesse_profiles_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

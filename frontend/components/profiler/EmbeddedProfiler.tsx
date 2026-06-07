"use client";

import { useState } from "react";
import { ProfilerRibbon, type ProfilerView } from "./ProfilerRibbon";
import { ProfilerQuestionsPanel } from "./ProfilerQuestionsPanel";
import { ProfilerSummaryPanel } from "./ProfilerSummaryPanel";
import { SaveProfileBar } from "./SaveProfileBar";
import type { ProfilerAnswers } from "@/lib/profiler/questions";

export interface EmbeddedProfilerProps {
  clientName: string;
  answers: ProfilerAnswers;
  onAnswersChange: (answers: ProfilerAnswers) => void;
  onSave: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  isSaving?: boolean;
  saveStatus?: string;
  saveError?: boolean;
  showSaveProfileBar?: boolean;
  saveProfileBarHint?: string;
  showResetButton?: boolean;
  onReset?: () => void;
  initialSection?: number;
}

export function EmbeddedProfiler({
  clientName,
  answers,
  onAnswersChange,
  onSave,
  saveLabel,
  saveDisabled = false,
  isSaving = false,
  saveStatus,
  saveError = false,
  showSaveProfileBar = false,
  saveProfileBarHint,
  showResetButton = true,
  onReset,
  initialSection = 0,
}: EmbeddedProfilerProps) {
  const [activeView, setActiveView] = useState<ProfilerView>("questions");
  const [activeSection, setActiveSection] = useState(initialSection);

  const handleSelect = (questionNum: number, optionIndex: number) => {
    onAnswersChange({ ...answers, [questionNum]: optionIndex });
  };

  const handleSectionSelect = (index: number) => {
    setActiveSection(index);
    setActiveView("questions");
  };

  const handleReset = () => {
    onAnswersChange({});
    setActiveSection(0);
    setActiveView("questions");
    onReset?.();
  };

  return (
    <div className="mb-8">
      <ProfilerRibbon
        variant="embedded"
        answers={answers}
        activeSection={activeSection}
        activeView={activeView}
        onSectionSelect={handleSectionSelect}
        onSummarySelect={() => setActiveView("summary")}
      />

      {showSaveProfileBar && (
        <div className="px-5 pt-4">
          <SaveProfileBar
            answers={answers}
            onSave={onSave}
            isSaving={isSaving}
            saveStatus={saveStatus}
            saveError={saveError}
            saveLabel={saveLabel}
            clientName={clientName}
            hint={saveProfileBarHint}
          />
        </div>
      )}

      {activeView === "questions" ? (
        <ProfilerQuestionsPanel
          answers={answers}
          activeSection={activeSection}
          onSelect={handleSelect}
        />
      ) : (
        <ProfilerSummaryPanel
          answers={answers}
          clientName={clientName}
          onSave={onSave}
          saveLabel={saveLabel}
          saveDisabled={saveDisabled}
          saveStatus={saveStatus}
          saveError={saveError}
          showSaveButton
          showResetButton={showResetButton}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

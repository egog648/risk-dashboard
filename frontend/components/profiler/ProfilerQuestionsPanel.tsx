"use client";

import { QuestionBlock } from "./QuestionBlock";
import { SECTIONS, type ProfilerAnswers } from "@/lib/profiler/questions";

export interface ProfilerQuestionsPanelProps {
  answers: ProfilerAnswers;
  activeSection: number;
  onSelect: (questionNum: number, optionIndex: number) => void;
  clientName?: string;
  onClientNameChange?: (name: string) => void;
  showClientInput?: boolean;
}

export function ProfilerQuestionsPanel({
  answers,
  activeSection,
  onSelect,
  clientName = "",
  onClientNameChange,
  showClientInput = false,
}: ProfilerQuestionsPanelProps) {
  const section = SECTIONS[activeSection];

  return (
    <div className="max-w-[1100px] mx-auto p-5 print:hidden">
      {showClientInput && (
        <input
          type="text"
          className="w-full px-3 py-2 border-[1.5px] border-[#dde4ec] rounded-lg text-sm text-ff-navy mb-4 bg-white outline-none focus:border-ff-navy placeholder:text-[#b0bec5]"
          placeholder="Client name..."
          value={clientName}
          onChange={(e) => onClientNameChange?.(e.target.value)}
        />
      )}
      <p className="text-xs text-ff-muted mb-4 italic">{section.subtitle}</p>
      {section.questions.map((q) => (
        <QuestionBlock
          key={q.num}
          question={q}
          selectedIndex={answers[q.num]}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

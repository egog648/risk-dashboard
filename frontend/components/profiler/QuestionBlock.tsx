"use client";

import type { ProfilerQuestion } from "@/lib/profiler/questions";

interface QuestionBlockProps {
  question: ProfilerQuestion;
  selectedIndex?: number;
  onSelect: (questionNum: number, optionIndex: number) => void;
}

export function QuestionBlock({ question, selectedIndex, onSelect }: QuestionBlockProps) {
  return (
    <div className="mb-5">
      <div className="text-sm font-bold text-ff-navy mb-2 leading-snug">
        <span className="text-ff-muted mr-1.5">Q{question.num}.</span>
        {question.text}
      </div>
      <div className="flex flex-col gap-1">
        {question.options.map((opt, idx) => (
          <button
            key={opt.letter}
            type="button"
            onClick={() => onSelect(question.num, idx)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-[1.5px] text-left text-[13px] transition-all font-['DM_Sans',sans-serif] leading-snug ${
              selectedIndex === idx
                ? "border-2 border-ff-navy bg-[#eaf1f8] text-ff-navy font-semibold"
                : "border-[#dde4ec] bg-white text-ff-text-secondary hover:border-[#a0b4c8] hover:bg-[#fafcfe]"
            }`}
          >
            <span
              className={`w-[22px] h-[22px] min-w-[22px] rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                selectedIndex === idx
                  ? "border-ff-navy bg-ff-navy text-white"
                  : "border-[#c0ccda] text-ff-muted"
              }`}
            >
              {opt.letter}
            </span>
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

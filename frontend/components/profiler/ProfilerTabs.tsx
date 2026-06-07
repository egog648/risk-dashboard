"use client";

import { SECTIONS } from "@/lib/profiler/questions";

interface ProfilerTabsProps {
  activeSection: number;
  counts: [number, number, number];
  onSelect: (index: number) => void;
}

export function ProfilerTabs({ activeSection, counts, onSelect }: ProfilerTabsProps) {
  return (
    <div className="flex gap-1.5 mb-5">
      {SECTIONS.map((sec, idx) => (
        <button
          key={sec.title}
          type="button"
          onClick={() => onSelect(idx)}
          className={`flex-1 py-2.5 px-1.5 rounded-lg border-[1.5px] text-[11px] font-bold text-center transition-all ${
            idx === activeSection
              ? "border-ff-navy bg-ff-navy text-white"
              : "border-[#dde4ec] bg-white text-ff-muted hover:border-[#b0c4d8] hover:bg-[#f6f9fc]"
          }`}
        >
          <div>{sec.title}</div>
          <div className="text-[9px] font-normal mt-0.5 opacity-70">
            {counts[idx]}/{sec.total}
          </div>
        </button>
      ))}
    </div>
  );
}

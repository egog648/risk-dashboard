"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ImportProfilesButton } from "./ImportProfilesButton";
import { SECTIONS, type ProfilerAnswers } from "@/lib/profiler/questions";
import { computeScores } from "@/lib/profiler/scoring";
import { getProfilerProgress } from "@/lib/profiler/progress";

export type ProfilerView = "questions" | "summary";

interface ProfilerRibbonBaseProps {
  answers: ProfilerAnswers;
  activeSection: number;
  activeView: ProfilerView;
  variant?: "page" | "embedded";
  onImport?: (name: string, answers: ProfilerAnswers) => void;
}

interface ProfilerRibbonRoutedProps extends ProfilerRibbonBaseProps {
  variant?: "page";
}

interface ProfilerRibbonEmbeddedProps extends ProfilerRibbonBaseProps {
  variant: "embedded";
  onSectionSelect: (index: number) => void;
  onSummarySelect: () => void;
}

export type ProfilerRibbonProps = ProfilerRibbonRoutedProps | ProfilerRibbonEmbeddedProps;

function NavButton({
  label,
  count,
  isActive,
  onClick,
  href,
}: {
  label: string;
  count?: string;
  isActive: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = `flex-1 py-2.5 px-1.5 rounded-lg border-[1.5px] text-[11px] font-bold text-center transition-all ${
    isActive
      ? "border-white bg-white text-ff-navy"
      : "border-white/40 bg-white/10 text-white hover:border-white/70 hover:bg-white/20"
  }`;

  const content = (
    <>
      <div>{label}</div>
      {count && <div className="text-[9px] font-normal mt-0.5 opacity-70">{count}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function ProfilerRibbon(props: ProfilerRibbonProps) {
  const { answers, activeSection, activeView, variant = "page", onImport } = props;
  const scores = useMemo(() => computeScores(answers), [answers]);
  const counts: [number, number, number] = [scores.objAns, scores.riskAns, scores.govAns];

  const isEmbedded = variant === "embedded";
  const bleedClass = isEmbedded ? "rounded-[14px] mb-4" : "-mx-6 -mt-6 mb-0";

  return (
    <div
      className={`bg-ff-navy text-white px-7 py-5 border-b-[3px] border-[#2a5d8f] print:hidden ${bleedClass}`}
    >
      <p className="text-[11px] uppercase tracking-[2.5px] opacity-55 mb-1">Finesse Funds</p>
      <h1 className="text-[22px] font-extrabold tracking-tight">Investment Profile Scorer</h1>
      <p className="text-xs opacity-45 mt-0.5">{getProfilerProgress(answers)}</p>

      <div className="mt-3 flex gap-1.5">
        {SECTIONS.map((sec, idx) => {
          const isActive = activeView === "questions" && activeSection === idx;
          if (isEmbedded) {
            const embedded = props as ProfilerRibbonEmbeddedProps;
            return (
              <NavButton
                key={sec.title}
                label={sec.title}
                count={`${counts[idx]}/${sec.total}`}
                isActive={isActive}
                onClick={() => embedded.onSectionSelect(idx)}
              />
            );
          }
          return (
            <NavButton
              key={sec.title}
              label={sec.title}
              count={`${counts[idx]}/${sec.total}`}
              isActive={isActive}
              href={`/profiler?section=${idx}`}
            />
          );
        })}
        {isEmbedded ? (
          <NavButton
            label="Profile Summary"
            isActive={activeView === "summary"}
            onClick={(props as ProfilerRibbonEmbeddedProps).onSummarySelect}
          />
        ) : (
          <NavButton
            label="Profile Summary"
            isActive={activeView === "summary"}
            href="/profiler/summary"
          />
        )}
      </div>

      {onImport && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ImportProfilesButton onImport={onImport} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useProfilerContext } from "@/components/profiler/ProfilerContext";
import { ProfilerQuestionsPanel } from "@/components/profiler/ProfilerQuestionsPanel";

export default function ProfilerPage() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeSection = Math.min(
    Math.max(parseInt(sectionParam ?? "0", 10) || 0, 0),
    2
  );

  const { answers, setAnswers, wizardKey } = useProfilerContext();

  const handleSelect = (questionNum: number, optionIndex: number) => {
    setAnswers({ ...answers, [questionNum]: optionIndex });
  };

  return (
    <ProfilerQuestionsPanel
      key={wizardKey}
      answers={answers}
      activeSection={activeSection}
      onSelect={handleSelect}
    />
  );
}

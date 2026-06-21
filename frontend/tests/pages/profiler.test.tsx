import React, { useState } from "react";
import { ProfilerQuestionsPanel } from "@/components/profiler/ProfilerQuestionsPanel";
import { ProfilerSummaryPanel } from "@/components/profiler/ProfilerSummaryPanel";
import { ALL_QUESTIONS, type ProfilerAnswers } from "@/lib/profiler/questions";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/profiler/summary",
  useSearchParams: () => new URLSearchParams(),
}));

function QuestionsHarness() {
  const [answers, setAnswers] = useState<ProfilerAnswers>({});

  return (
    <ProfilerQuestionsPanel
      answers={answers}
      activeSection={0}
      onSelect={(questionNum, optionIndex) => {
        setAnswers((current) => ({ ...current, [questionNum]: optionIndex }));
      }}
    />
  );
}

function buildFullAnswers(optionIndex = 3): ProfilerAnswers {
  return ALL_QUESTIONS.reduce<ProfilerAnswers>((acc, question) => {
    acc[question.num] = optionIndex;
    return acc;
  }, {});
}

describe("Profiler advisory pages", () => {
  it("renders the first questionnaire section", () => {
    renderWithProviders(<QuestionsHarness />);

    expect(screen.getByText("Where in the triangle")).toBeInTheDocument();
    expect(
      screen.getByText("What is the primary purpose of this investment account?")
    ).toBeInTheDocument();
  });

  it("marks a selected answer in the questionnaire", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuestionsHarness />);

    const firstOption = screen.getByRole("button", {
      name: /Protect principal \/ keep up with inflation/,
    });
    await user.click(firstOption);

    expect(firstOption.className).toContain("border-ff-navy");
  });

  it("renders summary scores and labels for a completed profile", async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <ProfilerSummaryPanel
        answers={buildFullAnswers()}
        clientName="Taylor Family"
        onSave={onSave}
        showSaveButton
      />
    );

    expect(await screen.findByText("Taylor Family")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Position")).toBeInTheDocument();
    expect(screen.getByText("Aggression Dial")).toBeInTheDocument();
    expect(screen.getByText("Recommended Allocation")).toBeInTheDocument();
    expect(screen.getAllByText("Equities").length).toBeGreaterThanOrEqual(1);
  });
});

"use client";

import { SECTIONS, type ProfilerAnswers } from "@/lib/profiler/questions";

function formatAnswer(
  questionNum: number,
  answers: ProfilerAnswers
): { text: string; unanswered: boolean } {
  const section = SECTIONS.find((s) => s.questions.some((q) => q.num === questionNum));
  const question = section?.questions.find((q) => q.num === questionNum);
  if (!question) return { text: "Not answered", unanswered: true };

  const selectedIndex = answers[questionNum];
  if (selectedIndex === undefined) return { text: "Not answered", unanswered: true };

  const option = question.options[selectedIndex];
  if (!option) return { text: "Not answered", unanswered: true };

  return { text: `${option.letter}. ${option.text}`, unanswered: false };
}

export function ProfilerQuestionsPrintSection({ answers }: { answers: ProfilerAnswers }) {
  return (
    <div className="print:break-before-page">
      <div className="text-sm font-extrabold text-ff-navy mb-1">
        Questionnaire Responses
      </div>
      <p className="text-[11px] text-ff-muted mb-4">
        Client responses recorded during the investment profile intake. Please review and sign below.
      </p>

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-5 print:break-inside-avoid">
          <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-2 border-b border-[#e8edf2] pb-1">
            {section.title}
          </div>
          <p className="text-[10px] text-ff-muted italic mb-3">{section.subtitle}</p>

          {section.questions.map((question) => {
            const { text, unanswered } = formatAnswer(question.num, answers);
            return (
              <div
                key={question.num}
                className="mb-4 print:break-inside-avoid border-l-[3px] border-[#e8edf2] pl-3"
              >
                <div className="text-[13px] font-bold text-ff-navy mb-1 leading-snug">
                  <span className="text-ff-muted mr-1">Q{question.num}.</span>
                  {question.text}
                </div>
                <div
                  className={`text-[12px] leading-snug ${
                    unanswered ? "text-ff-muted italic" : "text-ff-text-secondary font-medium"
                  }`}
                >
                  {unanswered ? text : `Answer: ${text}`}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

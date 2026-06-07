export interface ObjectiveOption {
  letter: string;
  text: string;
  g: number;
  i: number;
  s: number;
}

export interface RiskOption {
  letter: string;
  text: string;
  score: number;
}

export interface GovernorOption {
  letter: string;
  text: string;
  cap: number;
}

export interface ProfilerQuestion {
  num: number;
  text: string;
  options: ObjectiveOption[] | RiskOption[] | GovernorOption[];
}

export interface ProfilerSection {
  title: string;
  subtitle: string;
  questions: ProfilerQuestion[];
  total: number;
}

export const OBJECTIVE_QUESTIONS: ProfilerQuestion[] = [
  {
    num: 1,
    text: "What is the primary purpose of this investment account?",
    options: [
      { letter: "A", text: "Protect principal / keep up with inflation", g: 0, i: 0, s: 10 },
      { letter: "B", text: "Generate steady income (dividends, interest)", g: 0, i: 10, s: 0 },
      { letter: "C", text: "Long-term capital appreciation", g: 8, i: 0, s: 2 },
      { letter: "D", text: "Maximize growth aggressively", g: 10, i: 0, s: 0 },
    ],
  },
  {
    num: 2,
    text: "When do you expect to begin withdrawing from this account?",
    options: [
      { letter: "A", text: "Currently withdrawing or within 1–2 years", g: 0, i: 4, s: 6 },
      { letter: "B", text: "In 3–5 years", g: 2, i: 4, s: 4 },
      { letter: "C", text: "In 6–10 years", g: 6, i: 2, s: 2 },
      { letter: "D", text: "More than 10 years from now", g: 9, i: 0, s: 1 },
    ],
  },
  {
    num: 3,
    text: "How important is receiving regular income from this portfolio?",
    options: [
      { letter: "A", text: "Essential — I rely on it for living expenses", g: 0, i: 10, s: 0 },
      { letter: "B", text: "Important — meaningful but not sole source", g: 1, i: 7, s: 2 },
      { letter: "C", text: "Nice to have — I'd reinvest most of it", g: 6, i: 2, s: 2 },
      { letter: "D", text: "Not important — focused entirely on growth", g: 9, i: 0, s: 1 },
    ],
  },
  {
    num: 4,
    text: "Which best describes your overall financial situation?",
    options: [
      { letter: "A", text: "Retired/nearing retirement; significant portion of savings", g: 0, i: 3, s: 7 },
      { letter: "B", text: "Stable income; one of several savings sources", g: 3, i: 3, s: 4 },
      { letter: "C", text: "Peak earning years with time to recover", g: 7, i: 1, s: 2 },
      { letter: "D", text: "Substantial assets elsewhere; can take significant risk", g: 8, i: 1, s: 1 },
    ],
  },
  {
    num: 5,
    text: "What percentage of your total investable assets does this account represent?",
    options: [
      { letter: "A", text: "More than 75% — substantially all liquid wealth", g: 0, i: 1, s: 9 },
      { letter: "B", text: "50–75% — a major portion", g: 2, i: 2, s: 6 },
      { letter: "C", text: "25–50% — meaningful but not dominant", g: 5, i: 2, s: 3 },
      { letter: "D", text: "Less than 25% — significant assets elsewhere", g: 7, i: 1, s: 2 },
    ],
  },
];

export const RISK_QUESTIONS: ProfilerQuestion[] = [
  {
    num: 6,
    text: "Maximum portfolio decline you could tolerate in a single year?",
    options: [
      { letter: "A", text: "Any loss would concern me — stay close to breakeven", score: 1 },
      { letter: "B", text: "Up to 10% — uncomfortable but acceptable", score: 2 },
      { letter: "C", text: "10–20% if I understood why and believed in the plan", score: 3 },
      { letter: "D", text: "20–30%+ — the price of higher long-term returns", score: 4 },
    ],
  },
  {
    num: 7,
    text: "You invested $100K and one year later it's worth $80K. What do you do?",
    options: [
      { letter: "A", text: "Sell everything — can't afford to lose more", score: 1 },
      { letter: "B", text: "Shift a significant portion to bonds or cash", score: 2 },
      { letter: "C", text: "Hold steady — stick with the plan", score: 3 },
      { letter: "D", text: "Buy more — this is a buying opportunity", score: 4 },
    ],
  },
  {
    num: 8,
    text: "Which portfolio would you prefer? (Best / worst case over 12 months)",
    options: [
      { letter: "A", text: "Steady: +6% / −2%", score: 1 },
      { letter: "B", text: "Balanced: +12% / −10%", score: 2 },
      { letter: "C", text: "Growth: +20% / −18%", score: 3 },
      { letter: "D", text: "Aggressive: +35% / −30%", score: 4 },
    ],
  },
  {
    num: 9,
    text: "How would you describe your investment experience?",
    options: [
      { letter: "A", text: "Very limited — savings accounts or CDs", score: 1 },
      { letter: "B", text: "Some — mutual funds or basic retirement account", score: 2 },
      { letter: "C", text: "Experienced — diversified stocks, bonds, alternatives", score: 3 },
      { letter: "D", text: "Very experienced — actively trade securities/options", score: 4 },
    ],
  },
  {
    num: 10,
    text: "Markets drop 25% in a month due to a global crisis. How do you respond?",
    options: [
      { letter: "A", text: "Sell immediately — stop the bleeding", score: 1 },
      { letter: "B", text: "Call advisor and seriously consider reducing exposure", score: 2 },
      { letter: "C", text: "Uncomfortable, but trust the plan and sit tight", score: 3 },
      { letter: "D", text: "Get excited — start looking for what to buy", score: 4 },
    ],
  },
];

export const GOVERNOR_QUESTIONS: ProfilerQuestion[] = [
  {
    num: 11,
    text: "Do you have an adequate emergency fund (3–6 months) outside this account?",
    options: [
      { letter: "A", text: "No — this account may need to serve that purpose", cap: 30 },
      { letter: "B", text: "Partially — some reserves but not 3–6 months", cap: 60 },
      { letter: "C", text: "Yes — solid emergency fund separate from this", cap: 100 },
      { letter: "D", text: "Yes, and then some — substantial liquid reserves", cap: 100 },
    ],
  },
  {
    num: 12,
    text: "Do you have stable income that covers essential expenses without this portfolio?",
    options: [
      { letter: "A", text: "No — I depend on this portfolio for essentials", cap: 40 },
      { letter: "B", text: "Partially — income covers some but not all essentials", cap: 60 },
      { letter: "C", text: "Yes — income covers essentials comfortably", cap: 100 },
      { letter: "D", text: "Yes — income exceeds expenses significantly", cap: 100 },
    ],
  },
];

export const SECTIONS: ProfilerSection[] = [
  { title: "Investment Objective", subtitle: "Where in the triangle", questions: OBJECTIVE_QUESTIONS, total: 5 },
  { title: "Risk Tolerance", subtitle: "The aggression dial", questions: RISK_QUESTIONS, total: 5 },
  { title: "Financial Safeguards", subtitle: "The governor", questions: GOVERNOR_QUESTIONS, total: 2 },
];

export const ALL_QUESTIONS = [...OBJECTIVE_QUESTIONS, ...RISK_QUESTIONS, ...GOVERNOR_QUESTIONS];

export type ProfilerAnswers = Record<number, number>;

export function answersToLetters(answers: ProfilerAnswers): Record<string, string> {
  const result: Record<string, string> = {};
  ALL_QUESTIONS.forEach((q) => {
    if (answers[q.num] !== undefined) {
      result[`q${q.num}`] = q.options[answers[q.num]].letter;
    }
  });
  return result;
}

export function lettersToAnswers(letters: Record<string, string>): ProfilerAnswers {
  const result: ProfilerAnswers = {};
  ALL_QUESTIONS.forEach((q) => {
    const key = `q${q.num}`;
    if (letters[key]) {
      const idx = q.options.findIndex((o) => o.letter === letters[key]);
      if (idx >= 0) result[q.num] = idx;
    }
  });
  return result;
}

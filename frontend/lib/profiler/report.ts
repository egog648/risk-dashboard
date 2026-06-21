import type { ProfilerAnswers } from "./questions";
import { computeScores, getProfileLabel, getRiskLabel } from "./scoring";

export interface VehicleSuggestion {
  name: string;
  pct: number;
}

export interface SleeveAllocation {
  stocks: number;
  bonds: number;
  alts: number;
  cash: number;
}

export interface AdvisorReport {
  clientName: string;
  date: string;
  profileLabel: string;
  riskLabel: string;
  aggPct: number;
  gPct: number;
  iPct: number;
  sPct: number;
  sleeveAllocation: SleeveAllocation;
  passivePct: number;
  activePct: number;
  narrative: string;
  govWarning: string | null;
  eqVehicles: VehicleSuggestion[];
  bondVehicles: VehicleSuggestion[];
  altVehicles: VehicleSuggestion[];
  cashVehicles: VehicleSuggestion[];
  implementation: {
    eqStyle: string;
    incStyle: string;
    idxPct: number;
    actPct: number;
  };
}

export function buildEquityVehicles(stocks: number, agg: number): VehicleSuggestion[] {
  if (stocks <= 0) return [];
  if (agg <= 0.3) {
    return [
      { name: "US Total Market Index (VTI / ITOT)", pct: Math.round(stocks * 0.65) },
      { name: "International Developed (VXUS / IXUS)", pct: Math.round(stocks * 0.25) },
      {
        name: "Dividend Appreciation (VIG / DGRO)",
        pct: stocks - Math.round(stocks * 0.65) - Math.round(stocks * 0.25),
      },
    ];
  }
  if (agg <= 0.6) {
    return [
      { name: "US Total Market / S&P 500 Index", pct: Math.round(stocks * 0.45) },
      { name: "International Blend (Developed + EM)", pct: Math.round(stocks * 0.2) },
      { name: "Factor-Tilted / Smart Beta ETFs", pct: Math.round(stocks * 0.2) },
      {
        name: "Sector / Thematic ETFs",
        pct: stocks - Math.round(stocks * 0.45) - Math.round(stocks * 0.2) - Math.round(stocks * 0.2),
      },
    ];
  }
  return [
    { name: "US Core Index (S&P 500 / Total Market)", pct: Math.round(stocks * 0.3) },
    { name: "Individual Stock Positions", pct: Math.round(stocks * 0.3) },
    { name: "Sector / Thematic ETFs (Tech, Healthcare, etc.)", pct: Math.round(stocks * 0.2) },
    {
      name: "Small-Cap / Emerging Markets",
      pct: stocks - Math.round(stocks * 0.3) - Math.round(stocks * 0.3) - Math.round(stocks * 0.2),
    },
  ];
}

export function buildBondVehicles(bonds: number, agg: number): VehicleSuggestion[] {
  if (bonds <= 0) return [];
  if (agg <= 0.3) {
    return [
      { name: "US Treasury / Govt Bond Fund (VGSH / SHY)", pct: Math.round(bonds * 0.5) },
      { name: "Investment-Grade Corporate (LQD / VCIT)", pct: Math.round(bonds * 0.3) },
      { name: "Municipal Bonds (MUB / VTEB)", pct: bonds - Math.round(bonds * 0.5) - Math.round(bonds * 0.3) },
    ];
  }
  if (agg <= 0.6) {
    return [
      { name: "Aggregate Bond Index (AGG / BND)", pct: Math.round(bonds * 0.4) },
      { name: "Corporate Bonds (LQD / VCIT)", pct: Math.round(bonds * 0.35) },
      { name: "TIPS / Inflation Protected (TIP)", pct: bonds - Math.round(bonds * 0.4) - Math.round(bonds * 0.35) },
    ];
  }
  return [
    { name: "High-Yield Corporate (HYG / JNK)", pct: Math.round(bonds * 0.4) },
    { name: "Floating Rate / Bank Loans (BKLN)", pct: Math.round(bonds * 0.3) },
    { name: "Short-Duration Investment Grade", pct: bonds - Math.round(bonds * 0.4) - Math.round(bonds * 0.3) },
  ];
}

export function buildAltVehicles(alts: number, agg: number): VehicleSuggestion[] {
  if (alts <= 0) return [];
  const vehicles: VehicleSuggestion[] = [
    { name: "REITs (VNQ / SCHH)", pct: Math.round(alts * 0.5) },
  ];
  if (agg > 0.6) {
    vehicles.push(
      { name: "Commodities / Gold (GLD / IAU)", pct: Math.round(alts * 0.3) },
      {
        name: "Convertible Bonds / Preferred (CWB / PFF)",
        pct: alts - Math.round(alts * 0.5) - Math.round(alts * 0.3),
      }
    );
  } else {
    vehicles.push({ name: "Commodities / Gold (GLD / IAU)", pct: alts - Math.round(alts * 0.5) });
  }
  return vehicles;
}

export function buildCashVehicles(cash: number): VehicleSuggestion[] {
  if (cash <= 0) return [];
  return [
    { name: "Money Market Fund (VMFXX / SPAXX)", pct: Math.round(cash * 0.7) },
    { name: "Short-Term T-Bills (BIL / SGOV)", pct: cash - Math.round(cash * 0.7) },
  ];
}

export function computeSleeveAllocation(
  gPct: number,
  iPct: number,
  sPct: number,
  agg: number
): SleeveAllocation {
  const altFromEquity = agg > 0.5 ? Math.round(gPct * Math.min((agg - 0.5) * 0.4, 0.15)) : 0;
  const altFromIncome = agg > 0.4 ? Math.round(iPct * Math.min((agg - 0.4) * 0.3, 0.1)) : 0;
  const totalAlts = altFromEquity + altFromIncome;
  return {
    stocks: gPct - altFromEquity,
    bonds: iPct - altFromIncome,
    alts: totalAlts,
    cash: sPct,
  };
}

export function formatProfilerDate(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildAdvisorReport(
  answers: ProfilerAnswers,
  clientName = "Client",
  reportDate?: string
): AdvisorReport | null {
  const sc = computeScores(answers);
  if (sc.totalAns < 10) return null;

  const agg = sc.govAgg / 100;
  const gPct = Math.round(sc.g * 100);
  const iPct = Math.round(sc.i * 100);
  const sPct = Math.round(sc.s * 100);
  const aggPct = Math.round(sc.govAgg);

  const profileLabel = getProfileLabel(gPct, iPct, sPct);
  const riskLabel = getRiskLabel(aggPct);
  const sleeve = computeSleeveAllocation(gPct, iPct, sPct, agg);

  const passivePct = Math.round((1 - agg) * 100);
  const activePct = 100 - passivePct;

  let narrative = `${clientName} profiles as a ${profileLabel} investor with a ${riskLabel} risk posture. `;
  if (gPct >= 50) {
    narrative +=
      "The primary objective is capital appreciation, and the portfolio should be weighted toward equities with a long-term growth orientation. ";
  } else if (iPct >= 40) {
    narrative +=
      "Income generation is a meaningful priority, and the fixed income sleeve should emphasize yield-producing instruments appropriate to the risk level. ";
  } else if (sPct >= 40) {
    narrative +=
      "Capital preservation is a dominant concern, and the portfolio should prioritize principal protection with minimal volatility exposure. ";
  } else {
    narrative +=
      "The objectives are well-balanced across growth, income, and safety, calling for a diversified approach across all asset classes. ";
  }

  if (aggPct >= 60) {
    narrative +=
      "The client's risk tolerance supports more concentrated positions, active management, and alternative asset exposure within the equity and income sleeves.";
  } else if (aggPct >= 30) {
    narrative +=
      "The moderate risk tolerance suggests a blend of index-based core holdings with selective active positions where conviction is high.";
  } else {
    narrative +=
      "The conservative risk profile favors broad diversification, high-quality holdings, and minimal exposure to volatile or speculative instruments.";
  }

  let govWarning: string | null = null;
  if (sc.cap < 100 && sc.rawAgg > sc.cap) {
    govWarning = `The client's stated risk tolerance (${Math.round(sc.rawAgg)}%) was capped at ${Math.round(sc.govAgg)}% due to financial safeguard responses. `;
    if (sc.cap <= 30) {
      govWarning +=
        "The client lacks an adequate emergency fund and/or depends on this portfolio for essential expenses. A more conservative implementation is warranted regardless of stated preference.";
    } else if (sc.cap <= 60) {
      govWarning +=
        "Partial gaps in emergency reserves or income coverage suggest a moderated approach until the client's broader financial foundation is strengthened.";
    }
  }

  const eqStyle =
    agg > 0.7
      ? "Individual stocks, sector ETFs, small-cap, EM"
      : agg > 0.4
        ? "Factor-tilted ETFs, international blend, sector tilt"
        : "Total market index, S&P 500, large-cap blend";
  const incStyle =
    agg > 0.6
      ? "High-yield corporates, preferreds, convertibles"
      : agg > 0.3
        ? "Corporate bonds, intermediate duration"
        : "Treasuries, investment-grade munis";

  const today = reportDate ?? formatProfilerDate();

  return {
    clientName,
    date: today,
    profileLabel,
    riskLabel,
    aggPct,
    gPct,
    iPct,
    sPct,
    sleeveAllocation: sleeve,
    passivePct,
    activePct,
    narrative,
    govWarning,
    eqVehicles: buildEquityVehicles(sleeve.stocks, agg),
    bondVehicles: buildBondVehicles(sleeve.bonds, agg),
    altVehicles: buildAltVehicles(sleeve.alts, agg),
    cashVehicles: buildCashVehicles(sleeve.cash),
    implementation: {
      eqStyle,
      incStyle,
      idxPct: passivePct,
      actPct: activePct,
    },
  };
}

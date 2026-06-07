"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/": "Market Risk Overview",
  "/equities": "Equities",
  "/credit": "Credit",
  "/hard-assets": "Hard Assets / Alts",
  "/cash": "Cash",
  "/portfolio": "Portfolio Optimizer",
  "/tickers": "Vehicle Registry",
};

export function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Risk Dashboard";
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  return (
    <header className="h-12 bg-white border-b border-ff-border flex items-center justify-between px-6 shrink-0">
      <h2 className="text-sm font-semibold text-ff-navy">{title}</h2>
      <span className="text-xs text-ff-muted">{dateStr}</span>
    </header>
  );
}

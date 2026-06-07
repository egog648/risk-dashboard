"use client";

import { FinesseHeader } from "@/components/finesse/FinesseHeader";
import { TickerForm } from "@/components/tickers/TickerForm";
import { TickerList } from "@/components/tickers/TickerList";

export default function TickersPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <FinesseHeader
        title="Vehicle Registry"
        subtitle="Classify ETFs and tickers by Growth, Income, or Safety orientation"
      />
      <p className="text-sm text-ff-muted mb-6 -mt-2">
        Store implementation vehicles like JEPI for income-oriented equity exposure.
        Symbols are validated via Tiingo on save.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TickerForm />
        <TickerList />
      </div>
    </div>
  );
}

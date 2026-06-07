"use client";

import { useEquities, useCredit, useHardAssets, useCash } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";

const ASSET_CLASS_GROUPS = [
  { label: "Equities", hook: useEquities },
  { label: "Credit", hook: useCredit },
  { label: "Hard Assets", hook: useHardAssets },
  { label: "Cash", hook: useCash },
];

export default function OverviewPage() {
  const equities = useEquities();
  const credit = useCredit();
  const hardAssets = useHardAssets();
  const cash = useCash();

  const sections = [
    { label: "Equities", result: equities },
    { label: "Credit", result: credit },
    { label: "Hard Assets / Alts", result: hardAssets },
    { label: "Cash", result: cash },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Market Risk Overview</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Forward-looking risk and expected return across major asset classes
        </p>
      </div>

      {sections.map(({ label, result }) => (
        <section key={label}>
          <h2 className="text-lg font-semibold text-ff-navy mb-3">{label}</h2>
          {result.isLoading && (
            <div className="text-ff-muted text-sm">Loading {label}...</div>
          )}
          {result.isError && (
            <div className="text-red-400 text-sm">
              Failed to load {label}. Ensure the backend is running and data has been seeded.
            </div>
          )}
          {result.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {result.data.map((asset) => (
                <AssetClassCard key={`${asset.asset_class}-${asset.sub_class}`} data={asset} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

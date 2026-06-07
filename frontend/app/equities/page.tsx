"use client";

import { useEquities } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart } from "@/components/charts/CycleChart";
import { ReturnDistribution } from "@/components/charts/ReturnDistribution";
import { FinesseCard } from "@/components/finesse/FinesseCard";

export default function EquitiesPage() {
  const { data, isLoading, isError } = useEquities();

  if (isLoading) return <div className="text-ff-muted">Loading equities data...</div>;
  if (isError) return <div className="text-red-400">Failed to load equities data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Equities</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          US equity market risk across market capitalization tiers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((asset) => (
          <AssetClassCard key={asset.sub_class} data={asset} />
        ))}
      </div>

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <FinesseCard title="Price History (3Y)">
            <CycleChart assets={data} />
          </FinesseCard>
          <FinesseCard title="Return Distribution">
            <ReturnDistribution assets={data} />
          </FinesseCard>
        </div>
      )}
    </div>
  );
}

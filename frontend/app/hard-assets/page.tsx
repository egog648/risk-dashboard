"use client";

import { useHardAssets } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart } from "@/components/charts/CycleChart";
import { FinesseCard } from "@/components/finesse/FinesseCard";

export default function HardAssetsPage() {
  const { data, isLoading, isError } = useHardAssets();

  if (isLoading) return <div className="text-ff-muted">Loading hard assets data...</div>;
  if (isError) return <div className="text-red-400">Failed to load hard assets data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Hard Assets / Alts</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Real assets: REITs, gold, and broad commodities — inflation cycle analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((asset) => (
          <AssetClassCard key={asset.sub_class} data={asset} />
        ))}
      </div>

      {data && data.length > 0 && (
        <FinesseCard title="Price History (3Y)">
          <CycleChart assets={data} />
        </FinesseCard>
      )}
    </div>
  );
}

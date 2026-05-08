"use client";

import { useHardAssets } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart } from "@/components/charts/CycleChart";

export default function HardAssetsPage() {
  const { data, isLoading, isError } = useHardAssets();

  if (isLoading) return <div className="text-gray-400">Loading hard assets data...</div>;
  if (isError) return <div className="text-red-400">Failed to load hard assets data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Hard Assets / Alts</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Real assets: REITs, gold, and broad commodities — inflation cycle analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((asset) => (
          <AssetClassCard key={asset.sub_class} data={asset} />
        ))}
      </div>

      {data && data.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Price History (3Y)
          </h3>
          <CycleChart assets={data} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEquities } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart } from "@/components/charts/CycleChart";
import { ReturnDistribution } from "@/components/charts/ReturnDistribution";

export default function EquitiesPage() {
  const { data, isLoading, isError } = useEquities();

  if (isLoading) return <div className="text-gray-400">Loading equities data...</div>;
  if (isError) return <div className="text-red-400">Failed to load equities data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Equities</h1>
        <p className="text-gray-400 mt-1 text-sm">
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
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Price History (3Y)
            </h3>
            <CycleChart assets={data} />
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Return Distribution
            </h3>
            <ReturnDistribution assets={data} />
          </div>
        </div>
      )}
    </div>
  );
}

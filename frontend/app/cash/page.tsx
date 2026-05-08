"use client";

import { useCash } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart } from "@/components/charts/CycleChart";

export default function CashPage() {
  const { data, isLoading, isError } = useCash();

  if (isLoading) return <div className="text-gray-400">Loading cash data...</div>;
  if (isError) return <div className="text-red-400">Failed to load cash data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Cash</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Money market conditions, real rates, and Fed policy cycle
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((asset) => (
          <AssetClassCard key={asset.sub_class} data={asset} />
        ))}
      </div>

      {data && data.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            T-Bill Price History (3Y)
          </h3>
          <CycleChart assets={data} />
        </div>
      )}
    </div>
  );
}

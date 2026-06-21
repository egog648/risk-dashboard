"use client";

import { useCredit } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart, YieldCurveChart } from "@/components/charts/lazyCharts";
import { FinesseCard } from "@/components/finesse/FinesseCard";

export default function CreditPage() {
  const { data, isLoading, isError } = useCredit(true);

  if (isLoading && !data) {
    return <div className="text-ff-muted">Loading credit data...</div>;
  }
  if (isError) return <div className="text-red-400">Failed to load credit data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Credit</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Government and corporate bond risk, credit spreads, and yield curve analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((asset) => (
          <AssetClassCard key={asset.sub_class} data={asset} />
        ))}
      </div>

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <FinesseCard title="Yield Curve">
            <YieldCurveChart />
          </FinesseCard>
          <FinesseCard title="Credit Price History (3Y)">
            <CycleChart assets={data} />
          </FinesseCard>
        </div>
      )}
    </div>
  );
}

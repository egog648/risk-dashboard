"use client";

import { useCash } from "@/hooks/useAssetClass";
import { AssetClassCard } from "@/components/dashboard/AssetClassCard";
import { CycleChart } from "@/components/charts/CycleChart";
import { FinesseCard } from "@/components/finesse/FinesseCard";

export default function CashPage() {
  const { data, isLoading, isError } = useCash();

  if (isLoading) return <div className="text-ff-muted">Loading cash data...</div>;
  if (isError) return <div className="text-red-400">Failed to load cash data.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ff-navy">Cash</h1>
        <p className="text-ff-text-secondary mt-1 text-sm">
          Money market conditions, real rates, and Fed policy cycle
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((asset) => (
          <AssetClassCard key={asset.sub_class} data={asset} />
        ))}
      </div>

      {data && data.length > 0 && (
        <FinesseCard title="T-Bill Price History (3Y)">
          <CycleChart assets={data} />
        </FinesseCard>
      )}
    </div>
  );
}

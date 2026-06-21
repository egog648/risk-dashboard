"use client";

import { useQuery } from "@tanstack/react-query";
import { DATA_STATUS_STALE_TIME, fetchDataStatus } from "@/lib/api/dataStatus";

export function DataStatusBar() {
  const { data } = useQuery({
    queryKey: ["data-status"],
    queryFn: fetchDataStatus,
    staleTime: DATA_STATUS_STALE_TIME,
    retry: false,
  });

  if (!data) return null;

  const statusColors = {
    ok: "bg-green-500",
    stale: "bg-yellow-500",
    error: "bg-red-500",
  };

  const statusLabels = {
    ok: "Data current",
    stale: "Some data stale",
    error: "Data errors",
  };

  return (
    <div
      data-status-bar
      className="h-6 bg-white border-b border-ff-border flex items-center px-6 gap-2 shrink-0"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${statusColors[data.overall_status]}`}
      />
      <span className="text-xs text-ff-muted">
        {statusLabels[data.overall_status]} · as of{" "}
        {new Date(data.as_of).toLocaleTimeString()}
      </span>
    </div>
  );
}

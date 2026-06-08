"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface DataStatus {
  overall_status: "ok" | "stale" | "error";
  as_of: string;
}

export function DataStatusBar() {
  const { data } = useQuery<DataStatus>({
    queryKey: ["data-status"],
    queryFn: async () => {
      const res = await apiClient.get("/data-status");
      return res.data;
    },
    staleTime: 60 * 1000,
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

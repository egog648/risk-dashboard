import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface BackendHealth {
  status: string;
  capabilities?: {
    portfolio_analytics?: boolean;
    suggested_frontier?: boolean;
  };
}

function resolveHealthUrl(): string {
  const directBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
    return "/api/backend-health";
  }
  return `${directBase}/health`;
}

async function fetchBackendHealth(): Promise<BackendHealth> {
  const { data } = await axios.get<BackendHealth>(resolveHealthUrl(), { timeout: 5000 });
  return data;
}

export function useBackendHealth() {
  return useQuery({
    queryKey: ["backendHealth"],
    queryFn: fetchBackendHealth,
    staleTime: 30_000,
    retry: false,
  });
}

export function isBackendStale(health: BackendHealth | undefined): boolean {
  return Boolean(health?.capabilities && health.capabilities.portfolio_analytics === false);
}

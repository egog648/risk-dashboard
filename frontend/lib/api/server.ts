import type { AssetClassMetrics } from "@/types/assets";

const BASE_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

async function fetchAssetClassAll(
  path: string,
  includeHistory: boolean
): Promise<AssetClassMetrics[]> {
  const params = new URLSearchParams({
    include_history: String(includeHistory),
  });
  const response = await fetch(`${BASE_URL}/api/v1${path}?${params}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

export const serverAssetFetchers = {
  equities: (includeHistory = false) =>
    fetchAssetClassAll("/equities/all", includeHistory),
  credit: (includeHistory = false) =>
    fetchAssetClassAll("/credit/all", includeHistory),
  hardAssets: (includeHistory = false) =>
    fetchAssetClassAll("/hard-assets/all", includeHistory),
  cash: (includeHistory = false) =>
    fetchAssetClassAll("/cash/all", includeHistory),
};

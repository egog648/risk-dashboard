export type AssetClassHistoryOption = { history: boolean };

export const queryKeys = {
  equities: (includeHistory = false) =>
    ["equities", { history: includeHistory }] as const,
  credit: (includeHistory = false) =>
    ["credit", { history: includeHistory }] as const,
  hardAssets: (includeHistory = false) =>
    ["hard-assets", { history: includeHistory }] as const,
  cash: (includeHistory = false) => ["cash", { history: includeHistory }] as const,
};

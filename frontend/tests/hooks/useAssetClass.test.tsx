import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { ReactNode } from "react";
import { useCash, useCredit, useEquities, useHardAssets } from "@/hooks/useAssetClass";
import { createTestQueryClient } from "@/tests/utils/renderWithProviders";

function makeWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useAssetClass hooks", () => {
  it("loads equities", async () => {
    const result = renderHook(() => useEquities(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.result.current.data).toHaveLength(3));
  });

  it("loads credit", async () => {
    const result = renderHook(() => useCredit(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.result.current.data).toHaveLength(3));
  });

  it("loads hard assets", async () => {
    const result = renderHook(() => useHardAssets(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.result.current.data).toHaveLength(3));
  });

  it("loads cash", async () => {
    const result = renderHook(() => useCash(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.result.current.data).toHaveLength(1));
  });
});

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { useEfficientFrontier } from "@/hooks/useEfficientFrontier";
import { DEFAULT_WEIGHTS } from "@/types/portfolio";
import { createTestQueryClient } from "@/tests/utils/renderWithProviders";

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useEfficientFrontier", () => {
  it("posts weights and returns an optimizer response", async () => {
    const { result } = renderHook(() => useEfficientFrontier(), { wrapper });
    result.current.mutate({ weights: DEFAULT_WEIGHTS });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.frontier.length).toBeGreaterThan(0);
    expect(result.current.data?.max_sharpe).toBeDefined();
  });
});

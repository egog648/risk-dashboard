import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTicker,
  deactivateTicker,
  fetchTickers,
  updateTicker,
} from "@/lib/api/tickers";
import type { CustomTickerCreate } from "@/types/tickers";

export function useTickers(filters?: {
  asset_class?: string;
  primary_objective?: string;
}) {
  return useQuery({
    queryKey: ["tickers", filters],
    queryFn: () => fetchTickers(filters),
  });
}

export function useCreateTicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CustomTickerCreate) => createTicker(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickers"] }),
  });
}

export function useUpdateTicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CustomTickerCreate> }) =>
      updateTicker(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickers"] }),
  });
}

export function useDeactivateTicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivateTicker(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickers"] }),
  });
}

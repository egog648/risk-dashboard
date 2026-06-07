import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClient,
  createPortfolio,
  deleteClient,
  deletePortfolio,
  fetchClient,
  fetchClients,
  fetchOutlines,
  fetchPortfolio,
  fetchPortfolios,
  fetchProfiles,
  generateOutline,
  saveClientProfile,
  savePortfolioProfile,
  updateOutlineStatus,
} from "@/lib/api/clients";
import type { ClientCreate, ClientProfileCreate, PortfolioCreate } from "@/types/clients";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => fetchClient(id),
    enabled: id > 0,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientCreate) => createClient(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useProfiles(clientId: number) {
  return useQuery({
    queryKey: ["clients", clientId, "profiles"],
    queryFn: () => fetchProfiles(clientId),
    enabled: clientId > 0,
  });
}

export function useSaveClientProfile(clientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientProfileCreate) => saveClientProfile(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function usePortfolios(clientId: number) {
  return useQuery({
    queryKey: ["clients", clientId, "portfolios"],
    queryFn: () => fetchPortfolios(clientId),
    enabled: clientId > 0,
  });
}

export function usePortfolio(clientId: number, portfolioId: number) {
  return useQuery({
    queryKey: ["clients", clientId, "portfolios", portfolioId],
    queryFn: () => fetchPortfolio(clientId, portfolioId),
    enabled: clientId > 0 && portfolioId > 0,
  });
}

export function useCreatePortfolio(clientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PortfolioCreate) => createPortfolio(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeletePortfolio(clientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portfolioId: number) => deletePortfolio(clientId, portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}

export function useSavePortfolioProfile(clientId: number, portfolioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientProfileCreate) =>
      savePortfolioProfile(clientId, portfolioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "portfolios", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "portfolios"] });
    },
  });
}

export function useOutlines(clientId: number, portfolioId: number) {
  return useQuery({
    queryKey: ["clients", clientId, "portfolios", portfolioId, "outlines"],
    queryFn: () => fetchOutlines(clientId, portfolioId),
    enabled: clientId > 0 && portfolioId > 0,
  });
}

export function useGenerateOutline(clientId: number, portfolioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateOutline(clientId, portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clients", clientId, "portfolios", portfolioId, "outlines"],
      });
    },
  });
}

export function useUpdateOutlineStatus(clientId: number, portfolioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      outlineId,
      status,
    }: {
      outlineId: number;
      status: "draft" | "presented" | "implemented";
    }) => updateOutlineStatus(clientId, portfolioId, outlineId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clients", clientId, "portfolios", portfolioId, "outlines"],
      });
    },
  });
}

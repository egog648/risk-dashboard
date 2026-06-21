import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchPortfolios } from "@/lib/api/clients";
import { useClients } from "@/hooks/useClients";

export interface ClientPortfolioOption {
  clientId: number;
  clientName: string;
  portfolioId: number;
  portfolioName: string;
}

export function useAllClientPortfolios() {
  const { data: clients, isLoading: clientsLoading } = useClients();

  const portfolioQueries = useQueries({
    queries: (clients ?? []).map((client) => ({
      queryKey: ["clients", client.id, "portfolios"],
      queryFn: () => fetchPortfolios(client.id),
    })),
  });

  const options = useMemo(() => {
    const list: ClientPortfolioOption[] = [];
    clients?.forEach((client, index) => {
      const portfolios = portfolioQueries[index]?.data ?? [];
      for (const portfolio of portfolios) {
        list.push({
          clientId: client.id,
          clientName: client.name,
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
        });
      }
    });
    return list.sort(
      (a, b) =>
        a.clientName.localeCompare(b.clientName) ||
        a.portfolioName.localeCompare(b.portfolioName)
    );
  }, [clients, portfolioQueries]);

  const grouped = useMemo(() => {
    const map = new Map<string, ClientPortfolioOption[]>();
    for (const option of options) {
      const existing = map.get(option.clientName) ?? [];
      existing.push(option);
      map.set(option.clientName, existing);
    }
    return map;
  }, [options]);

  const isLoading =
    clientsLoading || portfolioQueries.some((query) => query.isLoading);

  return { options, grouped, isLoading };
}

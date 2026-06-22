import { apiClient } from "./client";
import type {
  Client,
  ClientCreate,
  ClientProfile,
  ClientProfileCreate,
  Portfolio,
  PortfolioCreate,
  PortfolioOutline,
  PortfolioUpdate,
} from "@/types/clients";

export async function fetchClients(): Promise<Client[]> {
  const { data } = await apiClient.get<Client[]>("/clients");
  return data;
}

export async function fetchClient(id: number): Promise<Client> {
  const { data } = await apiClient.get<Client>(`/clients/${id}`);
  return data;
}

export async function createClient(payload: ClientCreate): Promise<Client> {
  const { data } = await apiClient.post<Client>("/clients", payload);
  return data;
}

export async function updateClient(
  id: number,
  payload: Partial<ClientCreate>
): Promise<Client> {
  const { data } = await apiClient.put<Client>(`/clients/${id}`, payload);
  return data;
}

export async function deleteClient(id: number): Promise<Client> {
  const { data } = await apiClient.delete<Client>(`/clients/${id}`);
  return data;
}

export async function fetchProfiles(clientId: number): Promise<ClientProfile[]> {
  const { data } = await apiClient.get<ClientProfile[]>(`/clients/${clientId}/profiles`);
  return data;
}

export async function saveClientProfile(
  clientId: number,
  payload: ClientProfileCreate
): Promise<ClientProfile> {
  const { data } = await apiClient.post<ClientProfile>(
    `/clients/${clientId}/profiles`,
    payload
  );
  return data;
}

export async function fetchPortfolios(clientId: number): Promise<Portfolio[]> {
  const { data } = await apiClient.get<Portfolio[]>(`/clients/${clientId}/portfolios`);
  return data;
}

export async function createPortfolio(
  clientId: number,
  payload: PortfolioCreate
): Promise<Portfolio> {
  const { data } = await apiClient.post<Portfolio>(
    `/clients/${clientId}/portfolios`,
    payload
  );
  return data;
}

export async function fetchPortfolio(
  clientId: number,
  portfolioId: number
): Promise<Portfolio> {
  const { data } = await apiClient.get<Portfolio>(
    `/clients/${clientId}/portfolios/${portfolioId}`
  );
  return data;
}

export async function updatePortfolio(
  clientId: number,
  portfolioId: number,
  payload: PortfolioUpdate
): Promise<Portfolio> {
  const { data } = await apiClient.put<Portfolio>(
    `/clients/${clientId}/portfolios/${portfolioId}`,
    payload
  );
  return data;
}

export async function deletePortfolio(
  clientId: number,
  portfolioId: number
): Promise<Portfolio> {
  const { data } = await apiClient.delete<Portfolio>(
    `/clients/${clientId}/portfolios/${portfolioId}`
  );
  return data;
}

export async function savePortfolioProfile(
  clientId: number,
  portfolioId: number,
  payload: ClientProfileCreate
): Promise<ClientProfile> {
  const { data } = await apiClient.post<ClientProfile>(
    `/clients/${clientId}/portfolios/${portfolioId}/profiles`,
    payload
  );
  return data;
}

export async function fetchOutlines(
  clientId: number,
  portfolioId: number
): Promise<PortfolioOutline[]> {
  const { data } = await apiClient.get<PortfolioOutline[]>(
    `/clients/${clientId}/portfolios/${portfolioId}/outlines`
  );
  return data;
}

export async function generateOutline(
  clientId: number,
  portfolioId: number
): Promise<PortfolioOutline> {
  const { data } = await apiClient.post<PortfolioOutline>(
    `/clients/${clientId}/portfolios/${portfolioId}/outlines`
  );
  return data;
}

export async function updateOutlineStatus(
  clientId: number,
  portfolioId: number,
  outlineId: number,
  status: PortfolioOutline["status"]
): Promise<PortfolioOutline> {
  const { data } = await apiClient.patch<PortfolioOutline>(
    `/clients/${clientId}/portfolios/${portfolioId}/outlines/${outlineId}`,
    { status }
  );
  return data;
}

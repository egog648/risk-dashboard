import { http, HttpResponse } from "msw";
import { advisoryMockState, fixtures, resetAdvisoryMockState } from "@/tests/mocks/fixtures";
import type { Client, ClientProfile, ClientProfileCreate, ClientCreate } from "@/types/clients";
import type { CustomTicker, CustomTickerCreate } from "@/types/tickers";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

export { resetAdvisoryMockState };

function getClientPortfolios(clientId: number) {
  return advisoryMockState.portfolios[clientId] ?? [];
}

export const handlers = [
  http.get(`${BASE_URL}/equities/all`, () => HttpResponse.json(fixtures.equities)),
  http.get(`${BASE_URL}/credit/all`, () => HttpResponse.json(fixtures.credit)),
  http.get(`${BASE_URL}/hard-assets/all`, () => HttpResponse.json(fixtures.hardAssets)),
  http.get(`${BASE_URL}/cash/all`, () => HttpResponse.json(fixtures.cash)),
  http.get(`${BASE_URL}/data-status`, () => HttpResponse.json(fixtures.dataStatus)),
  http.get(`${BASE_URL}/credit/yield-curve`, () => HttpResponse.json(fixtures.yieldCurve)),
  http.post(`${BASE_URL}/portfolio/frontier`, () => HttpResponse.json(fixtures.frontier)),
  http.post(`${BASE_URL}/portfolio/analytics`, () =>
    HttpResponse.json(fixtures.portfolioAnalytics)
  ),
  http.get(`${BASE_URL}/clients`, () => HttpResponse.json(advisoryMockState.clients)),
  http.post(`${BASE_URL}/clients`, async ({ request }) => {
    const payload = (await request.json()) as ClientCreate;
    const now = new Date().toISOString();
    const client: Client = {
      id: advisoryMockState.nextClientId++,
      name: payload.name.trim(),
      notes: payload.notes ?? null,
      created_at: now,
      updated_at: now,
      current_profile_id: null,
      portfolio_count: 0,
    };
    advisoryMockState.clients.push(client);
    advisoryMockState.portfolios[client.id] = [];
    return HttpResponse.json(client, { status: 201 });
  }),
  http.get(`${BASE_URL}/clients/:clientId/profiles`, ({ params }) => {
    const clientId = Number(params.clientId);
    const profiles = advisoryMockState.profiles.filter((p) => p.client_id === clientId);
    return HttpResponse.json(profiles);
  }),
  http.post(`${BASE_URL}/clients/:clientId/profiles`, async ({ params, request }) => {
    const clientId = Number(params.clientId);
    const payload = (await request.json()) as ClientProfileCreate;
    const client = advisoryMockState.clients.find((c) => c.id === clientId);
    if (!client) {
      return new HttpResponse(null, { status: 404 });
    }

    advisoryMockState.profiles.forEach((profile) => {
      if (profile.client_id === clientId && profile.is_current && !profile.is_portfolio_override) {
        profile.is_current = false;
      }
    });

    const profile: ClientProfile = {
      id: advisoryMockState.nextProfileId++,
      client_id: clientId,
      is_portfolio_override: false,
      answers: payload.answers,
      growth_pct: payload.growth_pct,
      income_pct: payload.income_pct,
      safety_pct: payload.safety_pct,
      raw_aggression_pct: payload.raw_aggression_pct,
      governed_aggression_pct: payload.governed_aggression_pct,
      governor_cap_pct: payload.governor_cap_pct,
      profile_label: payload.profile_label,
      risk_label: payload.risk_label,
      questions_answered: payload.questions_answered,
      is_current: true,
      saved_at: new Date().toISOString(),
    };
    advisoryMockState.profiles.push(profile);
    client.current_profile_id = profile.id;
    client.updated_at = profile.saved_at;
    return HttpResponse.json(profile, { status: 201 });
  }),
  http.get(`${BASE_URL}/clients/:clientId/portfolios`, ({ params }) => {
    const clientId = Number(params.clientId);
    return HttpResponse.json(getClientPortfolios(clientId));
  }),
  http.get(`${BASE_URL}/clients/:clientId/portfolios/:portfolioId`, ({ params }) => {
    const clientId = Number(params.clientId);
    const portfolioId = Number(params.portfolioId);
    const portfolio = getClientPortfolios(clientId).find((p) => p.id === portfolioId);
    if (!portfolio) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(portfolio);
  }),
  http.put(`${BASE_URL}/clients/:clientId/portfolios/:portfolioId`, async ({ params, request }) => {
    const clientId = Number(params.clientId);
    const portfolioId = Number(params.portfolioId);
    const portfolios = getClientPortfolios(clientId);
    const index = portfolios.findIndex((p) => p.id === portfolioId);
    if (index < 0) {
      return new HttpResponse(null, { status: 404 });
    }
    const payload = (await request.json()) as Record<string, unknown>;
    portfolios[index] = {
      ...portfolios[index],
      ...payload,
      updated_at: new Date().toISOString(),
    } as (typeof portfolios)[number];
    return HttpResponse.json(portfolios[index]);
  }),
  http.get(`${BASE_URL}/clients/:clientId/portfolios/:portfolioId/outlines`, () =>
    HttpResponse.json(fixtures.portfolioOutlines)
  ),
  http.get(`${BASE_URL}/clients/:clientId`, ({ params }) => {
    const clientId = Number(params.clientId);
    const client = advisoryMockState.clients.find((c) => c.id === clientId);
    if (!client) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(client);
  }),
  http.get(`${BASE_URL}/tickers`, () => HttpResponse.json(advisoryMockState.tickers)),
  http.post(`${BASE_URL}/tickers`, async ({ request }) => {
    const payload = (await request.json()) as CustomTickerCreate;
    const now = new Date().toISOString();
    const ticker: CustomTicker = {
      id: advisoryMockState.nextTickerId++,
      ticker: payload.ticker.trim().toUpperCase(),
      display_name: payload.display_name.trim(),
      asset_class: payload.asset_class,
      primary_objective: payload.primary_objective,
      growth_pct: payload.growth_pct ?? 100,
      income_pct: payload.income_pct ?? 0,
      safety_pct: payload.safety_pct ?? 0,
      notes: payload.notes ?? null,
      risk_proxy_ticker: payload.risk_proxy_ticker ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    advisoryMockState.tickers.push(ticker);
    return HttpResponse.json(ticker, { status: 201 });
  }),
  http.get(`${BASE_URL}/tickers/recommend`, () =>
    HttpResponse.json({ recommendations: [] })
  ),
];

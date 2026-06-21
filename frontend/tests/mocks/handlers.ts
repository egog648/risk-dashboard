import { http, HttpResponse } from "msw";
import { fixtures } from "@/tests/mocks/fixtures";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

export const handlers = [
  http.get(`${BASE_URL}/equities/all`, () => HttpResponse.json(fixtures.equities)),
  http.get(`${BASE_URL}/credit/all`, () => HttpResponse.json(fixtures.credit)),
  http.get(`${BASE_URL}/hard-assets/all`, () => HttpResponse.json(fixtures.hardAssets)),
  http.get(`${BASE_URL}/cash/all`, () => HttpResponse.json(fixtures.cash)),
  http.get(`${BASE_URL}/data-status`, () => HttpResponse.json(fixtures.dataStatus)),
  http.get(`${BASE_URL}/credit/yield-curve`, () => HttpResponse.json(fixtures.yieldCurve)),
  http.post(`${BASE_URL}/portfolio/frontier`, () => HttpResponse.json(fixtures.frontier)),
  http.get(`${BASE_URL}/clients`, () => HttpResponse.json(fixtures.clients)),
  http.get(`${BASE_URL}/clients/:clientId/profiles`, () =>
    HttpResponse.json(fixtures.clientProfiles)
  ),
  http.get(`${BASE_URL}/clients/:clientId/portfolios`, ({ params }) => {
    const clientId = Number(params.clientId);
    const clientPortfolios = fixtures.clientPortfolios as Record<
      number,
      (typeof fixtures.clientPortfolios)[1]
    >;
    return HttpResponse.json(clientPortfolios[clientId] ?? []);
  }),
  http.get(`${BASE_URL}/clients/:clientId/portfolios/:portfolioId`, ({ params }) => {
    const clientId = Number(params.clientId);
    const portfolioId = Number(params.portfolioId);
    const clientPortfolios = fixtures.clientPortfolios as Record<
      number,
      (typeof fixtures.clientPortfolios)[1]
    >;
    const portfolio = (clientPortfolios[clientId] ?? []).find((p) => p.id === portfolioId);
    if (!portfolio) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(portfolio);
  }),
  http.get(`${BASE_URL}/clients/:clientId/portfolios/:portfolioId/outlines`, () =>
    HttpResponse.json(fixtures.portfolioOutlines)
  ),
  http.get(`${BASE_URL}/clients/:clientId`, ({ params }) => {
    const clientId = Number(params.clientId);
    const client = fixtures.clients.find((c) => c.id === clientId);
    if (!client) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(client);
  }),
  http.get(`${BASE_URL}/tickers/recommend`, () =>
    HttpResponse.json({ recommendations: [] })
  ),
];

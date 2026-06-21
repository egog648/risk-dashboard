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
  http.get(`${BASE_URL}/tickers/recommend`, () =>
    HttpResponse.json({ recommendations: [] })
  ),
];

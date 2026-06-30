"""API integration tests for de-risk endpoints."""

import json
from pathlib import Path

import pytest
from httpx import AsyncClient

FIXTURES = Path(__file__).resolve().parents[2] / "prospect_derisk_module" / "fixtures"


@pytest.mark.asyncio
async def test_derisk_upload_and_analyze(client: AsyncClient):
    client_resp = await client.post("/api/v1/clients", json={"name": "DeRisk Client"})
    assert client_resp.status_code == 201
    client_id = client_resp.json()["id"]

    portfolio_resp = await client.post(
        f"/api/v1/clients/{client_id}/portfolios",
        json={"name": "Trust Account"},
    )
    assert portfolio_resp.status_code == 201
    portfolio_id = portfolio_resp.json()["id"]

    portfolio_json = (FIXTURES / "corrected_portfolio.json").read_bytes()
    upload_resp = await client.post(
        f"/api/v1/de-risk/portfolios/{portfolio_id}/holdings",
        files={"file": ("corrected_portfolio.json", portfolio_json, "application/json")},
    )
    assert upload_resp.status_code == 200
    holdings = upload_resp.json()
    assert holdings["lot_count"] > 0

    assumptions_resp = await client.get(f"/api/v1/de-risk/portfolios/{portfolio_id}/assumptions")
    assert assumptions_resp.status_code == 200
    assert assumptions_resp.json()["tier_mode"] == "tax_budget"

    run_resp = await client.post(f"/api/v1/de-risk/portfolios/{portfolio_id}/analysis")
    assert run_resp.status_code == 200
    run_id = run_resp.json()["id"]

    tiers_resp = await client.get(f"/api/v1/de-risk/analysis/{run_id}/tiers")
    assert tiers_resp.status_code == 200
    tiers = tiers_resp.json()
    assert len(tiers["tiers"]) == 3
    assert tiers["tiers"][0]["n_lots"] == 108

    sell_list_resp = await client.get(f"/api/v1/de-risk/analysis/{run_id}/sell-list")
    assert sell_list_resp.status_code == 200
    assert len(sell_list_resp.json()["sold_lots"]) > 0

    options_resp = await client.get("/api/v1/de-risk/clients")
    assert options_resp.status_code == 200
    options = options_resp.json()
    match = next(o for o in options if o["portfolio_id"] == portfolio_id)
    assert match["has_holdings"] is True
    assert match["latest_run_id"] == run_id


@pytest.mark.asyncio
async def test_derisk_csv_upload_symbol_shares(client: AsyncClient):
    client_resp = await client.post("/api/v1/clients", json={"name": "CSV Client"})
    portfolio_resp = await client.post(
        f"/api/v1/clients/{client_resp.json()['id']}/portfolios",
        json={"name": "Brokerage"},
    )
    portfolio_id = portfolio_resp.json()["id"]
    csv_body = (
        "Symbol,Shares,Cost Basis,Trade Date,Description\n"
        "AAPL,100,15000,2020-01-15,Apple Inc\n"
    ).encode("utf-8")
    upload_resp = await client.post(
        f"/api/v1/de-risk/portfolios/{portfolio_id}/holdings",
        files={"file": ("holdings.csv", csv_body, "text/csv")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["lot_count"] == 1


@pytest.mark.asyncio
async def test_derisk_csv_bad_headers_returns_400(client: AsyncClient):
    client_resp = await client.post("/api/v1/clients", json={"name": "Bad CSV"})
    portfolio_resp = await client.post(
        f"/api/v1/clients/{client_resp.json()['id']}/portfolios",
        json={"name": "Brokerage"},
    )
    portfolio_id = portfolio_resp.json()["id"]
    upload_resp = await client.post(
        f"/api/v1/de-risk/portfolios/{portfolio_id}/holdings",
        files={"file": ("bad.csv", b"Name,Value\nFoo,1\n", "text/csv")},
    )
    assert upload_resp.status_code == 400
    assert "detail" in upload_resp.json()


@pytest.mark.asyncio
async def test_derisk_csv_upload_without_extension(client: AsyncClient):
    client_resp = await client.post("/api/v1/clients", json={"name": "No Ext Client"})
    portfolio_resp = await client.post(
        f"/api/v1/clients/{client_resp.json()['id']}/portfolios",
        json={"name": "Brokerage"},
    )
    portfolio_id = portfolio_resp.json()["id"]
    csv_body = b"Symbol,Quantity,Cost Basis\nAAPL,10,1000\n"
    upload_resp = await client.post(
        f"/api/v1/de-risk/portfolios/{portfolio_id}/holdings",
        files={"file": ("Portfolio Positions", csv_body, "text/plain")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["lot_count"] == 1


@pytest.mark.asyncio
async def test_derisk_non_taxable_assumptions(client: AsyncClient):
    client_resp = await client.post("/api/v1/clients", json={"name": "IRA Client"})
    portfolio_resp = await client.post(
        f"/api/v1/clients/{client_resp.json()['id']}/portfolios",
        json={"name": "IRA"},
    )
    portfolio_id = portfolio_resp.json()["id"]

    update_resp = await client.put(
        f"/api/v1/de-risk/portfolios/{portfolio_id}/assumptions",
        json={"tax_treatment": "traditional_ira"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["tier_mode"] == "beta_target"
    assert data["lt_rate"] == 0.0

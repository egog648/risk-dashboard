import pytest
from httpx import AsyncClient


@pytest.fixture(autouse=True)
def mock_tiingo(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "app.services.tickers.registry.validate_ticker_symbol",
        lambda _symbol, _db: True,
    )


@pytest.mark.asyncio
async def test_create_and_list_ticker(client: AsyncClient):
    payload = {
        "ticker": "jepi",
        "display_name": "JPMorgan Equity Premium Income ETF",
        "asset_class": "equities",
        "primary_objective": "income",
        "growth_pct": 10,
        "income_pct": 80,
        "safety_pct": 10,
        "notes": "Covered-call income equity",
    }
    create_resp = await client.post("/api/v1/tickers", json=payload)
    assert create_resp.status_code == 201
    body = create_resp.json()
    assert body["ticker"] == "JEPI"
    assert body["growth_pct"] == 10
    assert body["is_active"] is True

    list_resp = await client.get("/api/v1/tickers")
    assert list_resp.status_code == 200
    tickers = list_resp.json()
    assert len(tickers) == 1
    assert tickers[0]["ticker"] == "JEPI"


@pytest.mark.asyncio
async def test_create_defaults_triangle_from_primary(client: AsyncClient):
    payload = {
        "ticker": "VTI",
        "display_name": "Vanguard Total Stock Market ETF",
        "asset_class": "equities",
        "primary_objective": "growth",
    }
    resp = await client.post("/api/v1/tickers", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["growth_pct"] == 100
    assert body["income_pct"] == 0
    assert body["safety_pct"] == 0


@pytest.mark.asyncio
async def test_reject_duplicate_ticker(client: AsyncClient):
    payload = {
        "ticker": "BIL",
        "display_name": "SPDR Bloomberg 1-3 Month T-Bill ETF",
        "asset_class": "cash",
        "primary_objective": "safety",
    }
    first = await client.post("/api/v1/tickers", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/v1/tickers", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_reject_invalid_triangle_sum(client: AsyncClient):
    payload = {
        "ticker": "SCHD",
        "display_name": "Schwab US Dividend Equity ETF",
        "asset_class": "equities",
        "primary_objective": "income",
        "growth_pct": 20,
        "income_pct": 70,
        "safety_pct": 5,
    }
    resp = await client.post("/api/v1/tickers", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_and_soft_delete(client: AsyncClient):
    create_resp = await client.post(
        "/api/v1/tickers",
        json={
            "ticker": "JEPQ",
            "display_name": "JPMorgan Nasdaq Equity Premium Income ETF",
            "asset_class": "equities",
            "primary_objective": "income",
        },
    )
    ticker_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/api/v1/tickers/{ticker_id}",
        json={"notes": "Nasdaq premium income"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["notes"] == "Nasdaq premium income"

    delete_resp = await client.delete(f"/api/v1/tickers/{ticker_id}")
    assert delete_resp.status_code == 200
    assert delete_resp.json()["is_active"] is False

    list_resp = await client.get("/api/v1/tickers")
    assert list_resp.json() == []


@pytest.mark.asyncio
async def test_filter_by_asset_class(client: AsyncClient):
    await client.post(
        "/api/v1/tickers",
        json={
            "ticker": "VTI",
            "display_name": "Vanguard Total Stock Market ETF",
            "asset_class": "equities",
            "primary_objective": "growth",
        },
    )
    await client.post(
        "/api/v1/tickers",
        json={
            "ticker": "BIL",
            "display_name": "SPDR Bloomberg 1-3 Month T-Bill ETF",
            "asset_class": "cash",
            "primary_objective": "safety",
        },
    )
    resp = await client.get("/api/v1/tickers", params={"asset_class": "cash"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["ticker"] == "BIL"

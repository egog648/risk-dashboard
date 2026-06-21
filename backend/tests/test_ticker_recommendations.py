import pytest
from httpx import AsyncClient


@pytest.fixture(autouse=True)
def mock_tiingo(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "app.services.tickers.registry.validate_ticker_symbol",
        lambda _symbol, _db: True,
    )


async def _create_ticker(client: AsyncClient, **overrides):
    payload = {
        "ticker": "VTI",
        "display_name": "Vanguard Total Stock Market ETF",
        "asset_class": "equities",
        "primary_objective": "growth",
        **overrides,
    }
    resp = await client.post("/api/v1/tickers", json=payload)
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_recommend_empty_registry(client: AsyncClient):
    resp = await client.get(
        "/api/v1/tickers/recommend",
        params={
            "growth_pct": 45,
            "income_pct": 35,
            "safety_pct": 20,
            "aggression": 55,
            "asset_class": "equities",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["recommendations"] == []


@pytest.mark.asyncio
async def test_recommend_triangle_match_ranks_closest(client: AsyncClient):
    await _create_ticker(
        client,
        ticker="VTI",
        display_name="Total Market",
        primary_objective="growth",
        growth_pct=100,
        income_pct=0,
        safety_pct=0,
    )
    await _create_ticker(
        client,
        ticker="JEPI",
        display_name="Equity Premium Income",
        primary_objective="income",
        growth_pct=10,
        income_pct=80,
        safety_pct=10,
    )

    resp = await client.get(
        "/api/v1/tickers/recommend",
        params={
            "growth_pct": 15,
            "income_pct": 65,
            "safety_pct": 20,
            "aggression": 55,
            "asset_class": "equities",
        },
    )
    assert resp.status_code == 200
    recs = resp.json()["recommendations"]
    assert len(recs) == 2
    assert recs[0]["ticker"] == "JEPI"
    assert recs[0]["match_score"] >= recs[1]["match_score"]


@pytest.mark.asyncio
async def test_recommend_income_dominant_boosts_income_primary(client: AsyncClient):
    await _create_ticker(
        client,
        ticker="VTI",
        display_name="Total Market",
        primary_objective="growth",
        growth_pct=20,
        income_pct=20,
        safety_pct=60,
    )
    await _create_ticker(
        client,
        ticker="SCHD",
        display_name="Dividend Equity",
        primary_objective="income",
        growth_pct=20,
        income_pct=60,
        safety_pct=20,
    )

    resp = await client.get(
        "/api/v1/tickers/recommend",
        params={
            "growth_pct": 20,
            "income_pct": 60,
            "safety_pct": 20,
            "aggression": 40,
            "asset_class": "equities",
        },
    )
    assert resp.status_code == 200
    recs = resp.json()["recommendations"]
    assert recs[0]["ticker"] == "SCHD"
    assert recs[0]["primary_objective"] == "income"


@pytest.mark.asyncio
async def test_recommend_excludes_inactive_tickers(client: AsyncClient):
    created = await _create_ticker(
        client,
        ticker="VTI",
        display_name="Total Market",
        primary_objective="growth",
    )
    delete_resp = await client.delete(f"/api/v1/tickers/{created['id']}")
    assert delete_resp.status_code == 200

    resp = await client.get(
        "/api/v1/tickers/recommend",
        params={
            "growth_pct": 45,
            "income_pct": 35,
            "safety_pct": 20,
            "aggression": 55,
            "asset_class": "equities",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["recommendations"] == []

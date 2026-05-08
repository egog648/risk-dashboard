"""API smoke tests for core health and v1 endpoints."""
from fastapi import FastAPI
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.router import api_router
from app.api.v1.endpoints import data_status as data_status_endpoint

app = FastAPI()
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


@pytest.fixture(autouse=True)
def stub_background_refresh(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(data_status_endpoint, "refresh_all_data", lambda: None)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_data_status_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/data-status")
    assert response.status_code == 200
    payload = response.json()
    assert "overall_status" in payload
    assert "series" in payload


@pytest.mark.asyncio
async def test_refresh_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/data-status/refresh")
    assert response.status_code == 200
    payload = response.json()
    assert "message" in payload


@pytest.mark.asyncio
async def test_equities_all_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/equities/all")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)


@pytest.mark.asyncio
async def test_credit_all_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/credit/all")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)


@pytest.mark.asyncio
async def test_yield_curve_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/credit/yield-curve")
    assert response.status_code == 200
    payload = response.json()
    assert "points" in payload
    assert "data_status" in payload
    assert "missing_series" in payload


@pytest.mark.asyncio
async def test_hard_assets_all_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/hard-assets/all")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)


@pytest.mark.asyncio
async def test_cash_all_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/cash/all")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)

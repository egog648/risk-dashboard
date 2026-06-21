import asyncio

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.observability import (
    begin_refresh_run,
    complete_refresh_run,
    get_refresh_run_summary,
    record_series_result,
    reset_refresh_run_metrics,
)
from app.main import TimingMiddleware
from app.models.schemas import DataStatusResponse, RefreshRunSummary
from app.services.data_fetchers import data_manager


@pytest.fixture(autouse=True)
def reset_metrics():
    reset_refresh_run_metrics()
    yield
    reset_refresh_run_metrics()


def test_refresh_run_metrics_lifecycle():
    begin_refresh_run(3)
    running = get_refresh_run_summary()
    assert running is not None
    assert running.state == "running"
    assert running.total_series == 3
    assert running.ok_count == 0
    assert running.error_count == 0

    record_series_result("SP500", True)
    record_series_result("SPY", False)
    record_series_result("TLT", True)

    completed = complete_refresh_run()
    assert completed.state == "completed"
    assert completed.ok_count == 2
    assert completed.error_count == 1
    assert completed.failed_series == ["SPY"]
    assert completed.duration_ms is not None
    assert completed.started_at is not None
    assert completed.completed_at is not None


@pytest.mark.asyncio
async def test_refresh_all_data_records_metrics(monkeypatch: pytest.MonkeyPatch):
    def ok_fred(series_id: str):
        return series_id, True

    def fail_ticker(ticker: str):
        return ticker, False

    monkeypatch.setattr(data_manager, "_refresh_fred_series", ok_fred)
    monkeypatch.setattr(data_manager, "_refresh_ticker", fail_ticker)
    monkeypatch.setattr(data_manager, "invalidate_all", lambda: None)

    targets = list(data_manager.FRED_SERIES.keys()) + list(data_manager.YFINANCE_TICKERS.keys())
    await data_manager.refresh_all_data()

    summary = get_refresh_run_summary()
    assert summary is not None
    assert summary.state == "completed"
    assert summary.total_series == len(targets)
    assert summary.ok_count == len(data_manager.FRED_SERIES)
    assert summary.error_count == len(data_manager.YFINANCE_TICKERS)


@pytest.mark.asyncio
async def test_data_status_includes_refresh_run(client):
    begin_refresh_run(2)
    record_series_result("SP500", True)
    record_series_result("SPY", True)
    complete_refresh_run()

    response = await client.get("/api/v1/data-status")
    assert response.status_code == 200
    payload = response.json()
    parsed = DataStatusResponse.model_validate(payload)
    assert parsed.last_refresh_run is not None
    assert parsed.last_refresh_run.state == "completed"
    assert parsed.last_refresh_run.ok_count == 2
    RefreshRunSummary.model_validate(parsed.last_refresh_run.model_dump())


@pytest.mark.asyncio
async def test_timing_middleware_slow_request_warning(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "SLOW_REQUEST_THRESHOLD_MS", 1)

    test_app = FastAPI()
    test_app.add_middleware(TimingMiddleware)

    @test_app.get("/api/v1/test-slow")
    async def slow_route():
        await asyncio.sleep(0.05)
        return {"ok": True}

    @test_app.get("/health")
    def health():
        return {"status": "ok"}

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        response = await async_client.get("/api/v1/test-slow")
        assert response.status_code == 200
        assert response.headers.get("X-Slow-Request") == "1"
        assert response.headers.get("X-Response-Time", "").endswith("ms")

        health = await async_client.get("/health")
        assert health.status_code == 200
        assert "X-Slow-Request" not in health.headers

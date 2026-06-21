from datetime import UTC, datetime

import pandas as pd
import pytest

from app.api.v1.endpoints import cash, credit, equities, hard_assets, portfolio
from app.models.schemas import (
    AssetClassMetrics,
    DataStatusResponse,
    EfficientFrontierResponse,
    PortfolioWeights,
    YieldCurveResponse,
)


def _sample_asset_metrics(asset_class: str, sub_class: str) -> dict:
    return {
        "asset_class": asset_class,
        "sub_class": sub_class,
        "cycle_phase": "expansion",
        "risk_score": 42.0,
        "metrics": {
            "realized_vol": 0.14,
            "implied_vol": 0.17,
            "sharpe_ratio": 0.9,
            "sortino_ratio": 1.1,
            "max_drawdown": -0.11,
            "var_95": -0.02,
            "var_99": -0.03,
            "cvar_95": -0.035,
            "valuation_score": 0.4,
            "expected_return": 0.07,
        },
        "data_status": "ok",
        "missing_series": [],
        "history": [{"date": datetime.now(UTC).isoformat(), "value": 100.0}],
        "as_of": datetime.now(UTC).isoformat(),
    }


@pytest.mark.asyncio
async def test_data_status_contract(client):
    response = await client.get("/api/v1/data-status")
    assert response.status_code == 200

    payload = response.json()
    parsed = DataStatusResponse.model_validate(payload)
    assert parsed.overall_status in {"ok", "stale", "error"}
    assert isinstance(parsed.series, list)


@pytest.mark.asyncio
async def test_refresh_contract(client):
    response = await client.post("/api/v1/data-status/refresh")
    assert response.status_code == 200

    payload = response.json()
    assert payload == {"message": "Data refresh started in background"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("path", "patches"),
    [
        (
            "/api/v1/equities/all",
            [
                (equities.LargeCapEquities, "Equities", "Large Cap"),
                (equities.MidCapEquities, "Equities", "Mid Cap"),
                (equities.SmallCapEquities, "Equities", "Small Cap"),
            ],
        ),
        (
            "/api/v1/credit/all",
            [
                (credit.GovernmentBonds, "Credit", "Government Bonds"),
                (credit.CorporateBonds, "Credit", "Corporate Bonds"),
            ],
        ),
        (
            "/api/v1/hard-assets/all",
            [
                (hard_assets.Gold, "Hard Assets", "Gold"),
                (hard_assets.REITs, "Hard Assets", "REITs"),
                (hard_assets.Commodities, "Hard Assets", "Commodities"),
            ],
        ),
        (
            "/api/v1/cash/all",
            [(cash.MoneyMarket, "Cash", "Money Market")],
        ),
    ],
)
async def test_all_asset_endpoints_contract(client, monkeypatch, path: str, patches: list[tuple[type, str, str]]):
    for class_ref, asset_class_name, sub_class in patches:
        monkeypatch.setattr(
            class_ref,
            "get_metrics",
            lambda _self, _db, *, include_history=True, a=asset_class_name, s=sub_class: _sample_asset_metrics(
                a, s
            ),
        )

    response = await client.get(path)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    assert payload, f"{path} returned an empty list"
    for item in payload:
        parsed = AssetClassMetrics.model_validate(item)
        assert parsed.asset_class
        assert parsed.sub_class


@pytest.mark.asyncio
async def test_yield_curve_contract(client, monkeypatch):
    now = datetime.now(UTC)
    series_lookup = {
        "DTB3": pd.Series([5.1], index=[now]),
        "DGS2": pd.Series([4.9], index=[now]),
        "DGS10": pd.Series([4.2], index=[now]),
        "DGS30": pd.Series([4.3], index=[now]),
    }

    monkeypatch.setattr(credit, "fetch_series", lambda series_id, _db: series_lookup[series_id])

    response = await client.get("/api/v1/credit/yield-curve")
    assert response.status_code == 200

    payload = response.json()
    parsed = YieldCurveResponse.model_validate(payload)
    assert parsed.data_status == "ok"
    assert len(parsed.points) == 4
    assert parsed.missing_series == []


@pytest.mark.asyncio
async def test_portfolio_frontier_contract(client, monkeypatch):
    now = datetime.now(UTC)
    sample_series = pd.Series([100.0, 101.0, 102.0, 103.0], index=pd.date_range(end=now, periods=4, freq="D"))

    monkeypatch.setattr(portfolio, "fetch_ticker", lambda _ticker, _db: sample_series)
    monkeypatch.setattr(
        portfolio,
        "build_portfolio_expected_returns",
        lambda _db: {key: 0.06 for key in portfolio.ASSET_TICKERS},
    )

    point = {
        "expected_return": 0.08,
        "volatility": 0.12,
        "sharpe": 0.67,
        "weights": {key: 0.1 for key in portfolio.ASSET_TICKERS},
    }
    mu = pd.Series({key: 0.06 for key in portfolio.ASSET_TICKERS})
    cov = pd.DataFrame(
        0.01,
        index=list(portfolio.ASSET_TICKERS.keys()),
        columns=list(portfolio.ASSET_TICKERS.keys()),
    )
    monkeypatch.setattr(
        portfolio,
        "build_frontier",
        lambda _price_dict, _expected_ret, **kwargs: {
            "frontier": [point],
            "max_sharpe": point,
            "min_vol": point,
            "monte_carlo": [point],
            "correlation_matrix": {"equities_large": {"equities_large": 1.0}},
            "mu": mu,
            "cov": cov,
        },
    )
    monkeypatch.setattr(portfolio, "weights_to_frontier_point", lambda _weights, _mu, _cov: point)

    response = await client.post("/api/v1/portfolio/frontier", json=PortfolioWeights().model_dump())
    assert response.status_code == 200

    payload = response.json()
    parsed = EfficientFrontierResponse.model_validate(payload)
    assert len(parsed.frontier) == 1
    assert parsed.max_sharpe.weights
    assert parsed.correlation_matrix

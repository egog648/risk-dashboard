import pytest
from httpx import AsyncClient

from app.models.schemas import (
    ClientProfileResponse,
    ClientResponse,
    PortfolioOutlineResponse,
    PortfolioResponse,
)


def _sample_profile_payload(**overrides) -> dict:
    payload = {
        "answers": {
            "q1": "D",
            "q2": "D",
            "q3": "D",
            "q4": "D",
            "q5": "D",
            "q6": "D",
            "q7": "D",
            "q8": "D",
            "q9": "D",
            "q10": "D",
            "q11": "D",
            "q12": "D",
        },
        "growth_pct": 70,
        "income_pct": 15,
        "safety_pct": 15,
        "raw_aggression_pct": 100,
        "governed_aggression_pct": 100,
        "governor_cap_pct": 100,
        "profile_label": "Growth-Oriented",
        "risk_label": "Aggressive",
        "questions_answered": 12,
    }
    payload.update(overrides)
    return payload


async def _create_client(client: AsyncClient, name: str = "Test Client") -> ClientResponse:
    resp = await client.post("/api/v1/clients", json={"name": name, "notes": "Notes"})
    assert resp.status_code == 201
    return ClientResponse.model_validate(resp.json())


@pytest.mark.asyncio
async def test_client_crud_contract(client: AsyncClient):
    create_resp = await client.post(
        "/api/v1/clients",
        json={"name": "Jane Doe", "notes": "Initial notes"},
    )
    assert create_resp.status_code == 201
    created = ClientResponse.model_validate(create_resp.json())
    assert created.name == "Jane Doe"
    assert created.notes == "Initial notes"
    assert created.portfolio_count == 0
    assert created.current_profile_id is None

    list_resp = await client.get("/api/v1/clients")
    assert list_resp.status_code == 200
    clients = [ClientResponse.model_validate(c) for c in list_resp.json()]
    assert any(c.id == created.id for c in clients)

    detail_resp = await client.get(f"/api/v1/clients/{created.id}")
    assert detail_resp.status_code == 200
    ClientResponse.model_validate(detail_resp.json())

    update_resp = await client.put(
        f"/api/v1/clients/{created.id}",
        json={"name": "Jane Updated", "notes": "Updated notes"},
    )
    assert update_resp.status_code == 200
    updated = ClientResponse.model_validate(update_resp.json())
    assert updated.name == "Jane Updated"
    assert updated.notes == "Updated notes"

    delete_resp = await client.delete(f"/api/v1/clients/{created.id}")
    assert delete_resp.status_code == 200
    ClientResponse.model_validate(delete_resp.json())

    gone_resp = await client.get(f"/api/v1/clients/{created.id}")
    assert gone_resp.status_code == 404


@pytest.mark.asyncio
async def test_save_client_profile_contract(client: AsyncClient):
    created = await _create_client(client)

    profile_resp = await client.post(
        f"/api/v1/clients/{created.id}/profiles",
        json=_sample_profile_payload(),
    )
    assert profile_resp.status_code == 201
    profile = ClientProfileResponse.model_validate(profile_resp.json())
    assert profile.client_id == created.id
    assert profile.is_current is True
    assert profile.questions_answered == 12

    profiles_resp = await client.get(f"/api/v1/clients/{created.id}/profiles")
    assert profiles_resp.status_code == 200
    profiles = [ClientProfileResponse.model_validate(p) for p in profiles_resp.json()]
    assert len(profiles) == 1
    assert profiles[0].is_current is True

    client_resp = await client.get(f"/api/v1/clients/{created.id}")
    refreshed = ClientResponse.model_validate(client_resp.json())
    assert refreshed.current_profile_id == profile.id


@pytest.mark.asyncio
async def test_save_profile_requires_min_questions(client: AsyncClient):
    created = await _create_client(client)

    resp = await client.post(
        f"/api/v1/clients/{created.id}/profiles",
        json=_sample_profile_payload(questions_answered=5),
    )
    assert resp.status_code == 422
    assert "10 questions" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_portfolio_and_outline_workflow(client: AsyncClient):
    created = await _create_client(client, "Outline Client")

    profile_resp = await client.post(
        f"/api/v1/clients/{created.id}/profiles",
        json=_sample_profile_payload(),
    )
    assert profile_resp.status_code == 201

    portfolio_resp = await client.post(
        f"/api/v1/clients/{created.id}/portfolios",
        json={"name": "Retirement", "notes": "Primary account"},
    )
    assert portfolio_resp.status_code == 201
    portfolio = PortfolioResponse.model_validate(portfolio_resp.json())
    assert portfolio.name == "Retirement"
    assert portfolio.effective_profile_id is not None

    outline_resp = await client.post(
        f"/api/v1/clients/{created.id}/portfolios/{portfolio.id}/outlines"
    )
    assert outline_resp.status_code == 201
    outline = PortfolioOutlineResponse.model_validate(outline_resp.json())
    assert outline.portfolio_id == portfolio.id
    assert outline.status == "draft"
    assert outline.sleeve_allocation.stocks >= 0
    assert outline.weights.equities_large >= 0
    assert isinstance(outline.vehicles, dict)
    assert outline.narrative

    patch_resp = await client.patch(
        f"/api/v1/clients/{created.id}/portfolios/{portfolio.id}/outlines/{outline.id}",
        json={"status": "presented"},
    )
    assert patch_resp.status_code == 200
    patched = PortfolioOutlineResponse.model_validate(patch_resp.json())
    assert patched.status == "presented"


@pytest.mark.asyncio
async def test_portfolio_profile_override(client: AsyncClient):
    created = await _create_client(client, "Override Client")

    await client.post(
        f"/api/v1/clients/{created.id}/profiles",
        json=_sample_profile_payload(),
    )

    portfolio_resp = await client.post(
        f"/api/v1/clients/{created.id}/portfolios",
        json={"name": "Taxable"},
    )
    portfolio = PortfolioResponse.model_validate(portfolio_resp.json())

    override_resp = await client.post(
        f"/api/v1/clients/{created.id}/portfolios/{portfolio.id}/profiles",
        json=_sample_profile_payload(
            profile_label="Conservative Override",
            risk_label="Conservative",
            growth_pct=20,
            income_pct=50,
            safety_pct=30,
        ),
    )
    assert override_resp.status_code == 201
    override = ClientProfileResponse.model_validate(override_resp.json())
    assert override.is_portfolio_override is True

    detail_resp = await client.get(
        f"/api/v1/clients/{created.id}/portfolios/{portfolio.id}"
    )
    refreshed = PortfolioResponse.model_validate(detail_resp.json())
    assert refreshed.profile_override_id == override.id
    assert refreshed.effective_profile_id == override.id


@pytest.mark.asyncio
async def test_not_found_errors(client: AsyncClient):
    missing_client = await client.get("/api/v1/clients/9999")
    assert missing_client.status_code == 404

    update_client = await client.put("/api/v1/clients/9999", json={"name": "Ghost"})
    assert update_client.status_code == 404

    delete_client_resp = await client.delete("/api/v1/clients/9999")
    assert delete_client_resp.status_code == 404

    created = await _create_client(client)
    missing_portfolio = await client.get(f"/api/v1/clients/{created.id}/portfolios/9999")
    assert missing_portfolio.status_code == 404


@pytest.mark.asyncio
async def test_generate_outline_without_profile(client: AsyncClient):
    created = await _create_client(client, "No Profile Client")

    portfolio_resp = await client.post(
        f"/api/v1/clients/{created.id}/portfolios",
        json={"name": "Empty"},
    )
    portfolio = PortfolioResponse.model_validate(portfolio_resp.json())

    outline_resp = await client.post(
        f"/api/v1/clients/{created.id}/portfolios/{portfolio.id}/outlines"
    )
    assert outline_resp.status_code == 422
    assert "Complete the profiler first" in outline_resp.json()["detail"]

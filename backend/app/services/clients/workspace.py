"""Client workspace service — clients, profiles, portfolios, outlines."""
import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.db_models import Client, ClientProfile, Portfolio, PortfolioOutline
from app.models.schemas import (
    ClientCreate,
    ClientProfileCreate,
    ClientProfileResponse,
    ClientResponse,
    ClientUpdate,
    PortfolioCreate,
    PortfolioOutlineResponse,
    PortfolioResponse,
    PortfolioUpdate,
    PortfolioWeights,
    SleeveAllocation,
    VehicleSuggestion,
)
from app.services.profiler.mapping import build_outline_from_profile


def _profile_to_response(row: ClientProfile) -> ClientProfileResponse:
    return ClientProfileResponse(
        id=row.id,
        client_id=row.client_id,
        is_portfolio_override=row.is_portfolio_override,
        answers=json.loads(row.answers_json),
        growth_pct=row.growth_pct,
        income_pct=row.income_pct,
        safety_pct=row.safety_pct,
        raw_aggression_pct=row.raw_aggression_pct,
        governed_aggression_pct=row.governed_aggression_pct,
        governor_cap_pct=row.governor_cap_pct,
        profile_label=row.profile_label,
        risk_label=row.risk_label,
        questions_answered=row.questions_answered,
        is_current=row.is_current,
        saved_at=row.saved_at,
    )


def _outline_to_response(row: PortfolioOutline) -> PortfolioOutlineResponse:
    vehicles_raw = json.loads(row.vehicles_json)
    return PortfolioOutlineResponse(
        id=row.id,
        portfolio_id=row.portfolio_id,
        profile_id=row.profile_id,
        sleeve_allocation=SleeveAllocation(**json.loads(row.sleeve_allocation_json)),
        weights=PortfolioWeights(**json.loads(row.weights_json)),
        vehicles={
            k: [VehicleSuggestion(**v) for v in vals]
            for k, vals in vehicles_raw.items()
        },
        narrative=row.narrative,
        status=row.status,  # type: ignore[arg-type]
        created_at=row.created_at,
    )


def _get_client(db: Session, client_id: int) -> Client:
    row = db.query(Client).filter(Client.id == client_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return row


def _get_portfolio(db: Session, client_id: int, portfolio_id: int) -> Portfolio:
    row = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.client_id == client_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return row


def _get_current_client_profile(db: Session, client_id: int) -> ClientProfile | None:
    return (
        db.query(ClientProfile)
        .filter(
            ClientProfile.client_id == client_id,
            ClientProfile.is_current.is_(True),
            ClientProfile.is_portfolio_override.is_(False),
        )
        .order_by(ClientProfile.saved_at.desc())
        .first()
    )


def get_effective_profile(db: Session, portfolio: Portfolio) -> ClientProfile | None:
    if portfolio.profile_override_id:
        override = (
            db.query(ClientProfile)
            .filter(ClientProfile.id == portfolio.profile_override_id)
            .first()
        )
        if override:
            return override
    return _get_current_client_profile(db, portfolio.client_id)


def list_clients(db: Session) -> list[ClientResponse]:
    clients = db.query(Client).order_by(Client.name).all()
    if not clients:
        return []

    client_ids = [c.id for c in clients]
    profiles = (
        db.query(ClientProfile)
        .filter(
            ClientProfile.client_id.in_(client_ids),
            ClientProfile.is_current.is_(True),
            ClientProfile.is_portfolio_override.is_(False),
        )
        .all()
    )
    profile_map = {p.client_id: p for p in profiles}

    portfolio_counts = dict(
        db.query(Portfolio.client_id, func.count(Portfolio.id))
        .filter(Portfolio.client_id.in_(client_ids))
        .group_by(Portfolio.client_id)
        .all()
    )

    return [
        ClientResponse(
            id=c.id,
            name=c.name,
            notes=c.notes,
            created_at=c.created_at,
            updated_at=c.updated_at,
            current_profile_id=profile_map[c.id].id if c.id in profile_map else None,
            portfolio_count=portfolio_counts.get(c.id, 0),
        )
        for c in clients
    ]


def get_client(db: Session, client_id: int) -> ClientResponse:
    c = _get_client(db, client_id)
    current = _get_current_client_profile(db, c.id)
    count = db.query(Portfolio).filter(Portfolio.client_id == c.id).count()
    return ClientResponse(
        id=c.id,
        name=c.name,
        notes=c.notes,
        created_at=c.created_at,
        updated_at=c.updated_at,
        current_profile_id=current.id if current else None,
        portfolio_count=count,
    )


def create_client(db: Session, payload: ClientCreate) -> ClientResponse:
    row = Client(name=payload.name.strip(), notes=payload.notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return get_client(db, row.id)


def update_client(db: Session, client_id: int, payload: ClientUpdate) -> ClientResponse:
    row = _get_client(db, client_id)
    if payload.name is not None:
        row.name = payload.name.strip()
    if payload.notes is not None:
        row.notes = payload.notes
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return get_client(db, row.id)


def delete_client(db: Session, client_id: int) -> ClientResponse:
    row = _get_client(db, client_id)
    resp = get_client(db, client_id)
    db.delete(row)
    db.commit()
    return resp


def list_profiles(db: Session, client_id: int) -> list[ClientProfileResponse]:
    _get_client(db, client_id)
    rows = (
        db.query(ClientProfile)
        .filter(ClientProfile.client_id == client_id)
        .order_by(ClientProfile.saved_at.desc())
        .all()
    )
    return [_profile_to_response(r) for r in rows]


def save_client_profile(
    db: Session, client_id: int, payload: ClientProfileCreate
) -> ClientProfileResponse:
    _get_client(db, client_id)
    if payload.questions_answered < 10:
        raise HTTPException(
            status_code=422,
            detail="Please answer at least 10 questions before saving",
        )

    db.query(ClientProfile).filter(
        ClientProfile.client_id == client_id,
        ClientProfile.is_portfolio_override.is_(False),
        ClientProfile.is_current.is_(True),
    ).update({"is_current": False})

    row = ClientProfile(
        client_id=client_id,
        is_portfolio_override=False,
        answers_json=json.dumps(payload.answers),
        growth_pct=payload.growth_pct,
        income_pct=payload.income_pct,
        safety_pct=payload.safety_pct,
        raw_aggression_pct=payload.raw_aggression_pct,
        governed_aggression_pct=payload.governed_aggression_pct,
        governor_cap_pct=payload.governor_cap_pct,
        profile_label=payload.profile_label,
        risk_label=payload.risk_label,
        questions_answered=payload.questions_answered,
        is_current=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _profile_to_response(row)


def save_portfolio_profile(
    db: Session, client_id: int, portfolio_id: int, payload: ClientProfileCreate
) -> ClientProfileResponse:
    portfolio = _get_portfolio(db, client_id, portfolio_id)
    if payload.questions_answered < 10:
        raise HTTPException(
            status_code=422,
            detail="Please answer at least 10 questions before saving",
        )

    row = ClientProfile(
        client_id=client_id,
        is_portfolio_override=True,
        answers_json=json.dumps(payload.answers),
        growth_pct=payload.growth_pct,
        income_pct=payload.income_pct,
        safety_pct=payload.safety_pct,
        raw_aggression_pct=payload.raw_aggression_pct,
        governed_aggression_pct=payload.governed_aggression_pct,
        governor_cap_pct=payload.governor_cap_pct,
        profile_label=payload.profile_label,
        risk_label=payload.risk_label,
        questions_answered=payload.questions_answered,
        is_current=False,
    )
    db.add(row)
    db.flush()

    portfolio.profile_override_id = row.id
    portfolio.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _profile_to_response(row)


def list_portfolios(db: Session, client_id: int) -> list[PortfolioResponse]:
    _get_client(db, client_id)
    rows = (
        db.query(Portfolio)
        .filter(Portfolio.client_id == client_id)
        .order_by(Portfolio.name)
        .all()
    )
    return [_portfolio_to_response(db, r) for r in rows]


def _portfolio_to_response(db: Session, row: Portfolio) -> PortfolioResponse:
    effective = get_effective_profile(db, row)
    return PortfolioResponse(
        id=row.id,
        client_id=row.client_id,
        name=row.name,
        notes=row.notes,
        profile_override_id=row.profile_override_id,
        effective_profile_id=effective.id if effective else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def create_portfolio(db: Session, client_id: int, payload: PortfolioCreate) -> PortfolioResponse:
    _get_client(db, client_id)
    row = Portfolio(
        client_id=client_id,
        name=payload.name.strip(),
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _portfolio_to_response(db, row)


def get_portfolio(db: Session, client_id: int, portfolio_id: int) -> PortfolioResponse:
    row = _get_portfolio(db, client_id, portfolio_id)
    return _portfolio_to_response(db, row)


def update_portfolio(
    db: Session, client_id: int, portfolio_id: int, payload: PortfolioUpdate
) -> PortfolioResponse:
    row = _get_portfolio(db, client_id, portfolio_id)
    if payload.name is not None:
        row.name = payload.name.strip()
    if payload.notes is not None:
        row.notes = payload.notes
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _portfolio_to_response(db, row)


def delete_portfolio(db: Session, client_id: int, portfolio_id: int) -> PortfolioResponse:
    row = _get_portfolio(db, client_id, portfolio_id)
    resp = _portfolio_to_response(db, row)
    db.delete(row)
    db.commit()
    return resp


def list_outlines(
    db: Session, client_id: int, portfolio_id: int
) -> list[PortfolioOutlineResponse]:
    _get_portfolio(db, client_id, portfolio_id)
    rows = (
        db.query(PortfolioOutline)
        .filter(PortfolioOutline.portfolio_id == portfolio_id)
        .order_by(PortfolioOutline.created_at.desc())
        .all()
    )
    return [_outline_to_response(r) for r in rows]


def update_outline_status(
    db: Session,
    client_id: int,
    portfolio_id: int,
    outline_id: int,
    status: str,
) -> PortfolioOutlineResponse:
    _get_portfolio(db, client_id, portfolio_id)
    row = (
        db.query(PortfolioOutline)
        .filter(
            PortfolioOutline.id == outline_id,
            PortfolioOutline.portfolio_id == portfolio_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Outline not found")
    row.status = status
    db.commit()
    db.refresh(row)
    return _outline_to_response(row)


def generate_outline(
    db: Session, client_id: int, portfolio_id: int
) -> PortfolioOutlineResponse:
    portfolio = _get_portfolio(db, client_id, portfolio_id)
    profile = get_effective_profile(db, portfolio)
    if not profile:
        raise HTTPException(
            status_code=422,
            detail="No profile available. Complete the profiler first.",
        )

    outline_data = build_outline_from_profile(profile)
    row = PortfolioOutline(
        portfolio_id=portfolio_id,
        profile_id=profile.id,
        sleeve_allocation_json=json.dumps(outline_data["sleeve_allocation"]),
        weights_json=json.dumps(outline_data["weights"]),
        vehicles_json=json.dumps(outline_data["vehicles"]),
        narrative=outline_data["narrative"],
        status="draft",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _outline_to_response(row)

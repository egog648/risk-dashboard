from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import (
    ClientCreate,
    ClientProfileCreate,
    ClientProfileResponse,
    ClientResponse,
    ClientUpdate,
    PortfolioCreate,
    PortfolioOutlineResponse,
    PortfolioOutlineStatusUpdate,
    PortfolioResponse,
    PortfolioUpdate,
)
from app.services.clients import workspace

router = APIRouter()


@router.get("", response_model=list[ClientResponse])
def list_clients(db: Session = Depends(get_db)):
    return workspace.list_clients(db)


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    return workspace.create_client(db, payload)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    return workspace.get_client(db, client_id)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, payload: ClientUpdate, db: Session = Depends(get_db)):
    return workspace.update_client(db, client_id, payload)


@router.delete("/{client_id}", response_model=ClientResponse)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    return workspace.delete_client(db, client_id)


@router.get("/{client_id}/profiles", response_model=list[ClientProfileResponse])
def list_profiles(client_id: int, db: Session = Depends(get_db)):
    return workspace.list_profiles(db, client_id)


@router.post("/{client_id}/profiles", response_model=ClientProfileResponse, status_code=201)
def save_client_profile(
    client_id: int, payload: ClientProfileCreate, db: Session = Depends(get_db)
):
    return workspace.save_client_profile(db, client_id, payload)


@router.get("/{client_id}/portfolios", response_model=list[PortfolioResponse])
def list_portfolios(client_id: int, db: Session = Depends(get_db)):
    return workspace.list_portfolios(db, client_id)


@router.post("/{client_id}/portfolios", response_model=PortfolioResponse, status_code=201)
def create_portfolio(
    client_id: int, payload: PortfolioCreate, db: Session = Depends(get_db)
):
    return workspace.create_portfolio(db, client_id, payload)


@router.get("/{client_id}/portfolios/{portfolio_id}", response_model=PortfolioResponse)
def get_portfolio(client_id: int, portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.get_portfolio(db, client_id, portfolio_id)


@router.put("/{client_id}/portfolios/{portfolio_id}", response_model=PortfolioResponse)
def update_portfolio(
    client_id: int,
    portfolio_id: int,
    payload: PortfolioUpdate,
    db: Session = Depends(get_db),
):
    return workspace.update_portfolio(db, client_id, portfolio_id, payload)


@router.delete("/{client_id}/portfolios/{portfolio_id}", response_model=PortfolioResponse)
def delete_portfolio(client_id: int, portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.delete_portfolio(db, client_id, portfolio_id)


@router.post(
    "/{client_id}/portfolios/{portfolio_id}/profiles",
    response_model=ClientProfileResponse,
    status_code=201,
)
def save_portfolio_profile(
    client_id: int,
    portfolio_id: int,
    payload: ClientProfileCreate,
    db: Session = Depends(get_db),
):
    return workspace.save_portfolio_profile(db, client_id, portfolio_id, payload)


@router.get(
    "/{client_id}/portfolios/{portfolio_id}/outlines",
    response_model=list[PortfolioOutlineResponse],
)
def list_outlines(client_id: int, portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.list_outlines(db, client_id, portfolio_id)


@router.post(
    "/{client_id}/portfolios/{portfolio_id}/outlines",
    response_model=PortfolioOutlineResponse,
    status_code=201,
)
def generate_outline(client_id: int, portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.generate_outline(db, client_id, portfolio_id)


@router.patch(
    "/{client_id}/portfolios/{portfolio_id}/outlines/{outline_id}",
    response_model=PortfolioOutlineResponse,
)
def update_outline_status(
    client_id: int,
    portfolio_id: int,
    outline_id: int,
    payload: PortfolioOutlineStatusUpdate,
    db: Session = Depends(get_db),
):
    return workspace.update_outline_status(
        db, client_id, portfolio_id, outline_id, payload.status
    )

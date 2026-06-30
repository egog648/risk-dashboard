from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import (
    DeRiskClientPortfolioOption,
    DeriskAnalysisRunResponse,
    DeriskAssumptionsResponse,
    DeriskAssumptionsUpdate,
    DeriskLotsResponse,
    DeriskSellListResponse,
    DeriskTiersResponse,
    HoldingsSnapshotResponse,
)
from app.services.derisk import workspace

router = APIRouter()


@router.get("/clients", response_model=list[DeRiskClientPortfolioOption])
def list_client_portfolios(db: Session = Depends(get_db)):
    return workspace.list_client_portfolio_options(db)


@router.get("/portfolios/{portfolio_id}/holdings", response_model=HoldingsSnapshotResponse | None)
def get_holdings(portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.get_latest_holdings(db, portfolio_id)


@router.post("/portfolios/{portfolio_id}/holdings", response_model=HoldingsSnapshotResponse)
async def upload_holdings(
    portfolio_id: int,
    file: UploadFile = File(...),
    source: str | None = Form(None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    return workspace.upload_holdings(
        db, portfolio_id, content, file.filename or "upload.json", source
    )


@router.get("/portfolios/{portfolio_id}/assumptions", response_model=DeriskAssumptionsResponse)
def get_assumptions(portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.get_assumptions(db, portfolio_id)


@router.put("/portfolios/{portfolio_id}/assumptions", response_model=DeriskAssumptionsResponse)
def update_assumptions(
    portfolio_id: int,
    payload: DeriskAssumptionsUpdate,
    db: Session = Depends(get_db),
):
    return workspace.update_assumptions(db, portfolio_id, payload)


@router.post("/portfolios/{portfolio_id}/analysis", response_model=DeriskAnalysisRunResponse)
def run_analysis(portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.run_derisk_analysis(db, portfolio_id)


@router.get("/portfolios/{portfolio_id}/analysis/latest", response_model=DeriskAnalysisRunResponse | None)
def get_latest_analysis(portfolio_id: int, db: Session = Depends(get_db)):
    return workspace.get_latest_run(db, portfolio_id)


@router.get("/analysis/{run_id}/tiers", response_model=DeriskTiersResponse)
def get_tiers(run_id: int, db: Session = Depends(get_db)):
    return workspace.get_tiers(db, run_id)


@router.get("/analysis/{run_id}/sell-list", response_model=DeriskSellListResponse)
def get_sell_list(run_id: int, db: Session = Depends(get_db)):
    return workspace.get_sell_list(db, run_id)


@router.get("/analysis/{run_id}/lots", response_model=DeriskLotsResponse)
def get_lots(run_id: int, db: Session = Depends(get_db)):
    return workspace.get_lots(db, run_id)

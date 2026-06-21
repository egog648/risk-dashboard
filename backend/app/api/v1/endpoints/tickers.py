from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import (
    AssetClassKind,
    CustomTickerCreate,
    CustomTickerResponse,
    CustomTickerUpdate,
    TickerRecommendResponse,
    TickerValidateRequest,
    TickerValidateResponse,
)
from app.services.data_fetchers.yfinance_client import validate_ticker_symbol
from app.services.tickers import recommendations, registry

router = APIRouter()


@router.get("", response_model=list[CustomTickerResponse])
def list_tickers(
    asset_class: str | None = Query(None),
    primary_objective: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return registry.list_tickers(db, asset_class=asset_class, primary_objective=primary_objective)


@router.post("/validate", response_model=TickerValidateResponse)
def validate_ticker(payload: TickerValidateRequest, db: Session = Depends(get_db)):
    symbol = payload.ticker.strip().upper()
    valid = validate_ticker_symbol(symbol, db)
    return TickerValidateResponse(
        ticker=symbol,
        valid=valid,
        message=None if valid else f"Ticker {symbol} not found or unavailable on Tiingo",
    )


@router.post("", response_model=CustomTickerResponse, status_code=201)
def create_ticker(payload: CustomTickerCreate, db: Session = Depends(get_db)):
    return registry.create_ticker(db, payload)


@router.get("/recommend", response_model=TickerRecommendResponse)
def recommend_tickers(
    growth_pct: float = Query(..., ge=0, le=100),
    income_pct: float = Query(..., ge=0, le=100),
    safety_pct: float = Query(..., ge=0, le=100),
    aggression: float = Query(..., ge=0, le=100),
    asset_class: AssetClassKind = Query(...),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    try:
        results = recommendations.recommend_tickers(
            db,
            growth_pct=growth_pct,
            income_pct=income_pct,
            safety_pct=safety_pct,
            aggression=aggression,
            asset_class=asset_class,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TickerRecommendResponse(recommendations=results)


@router.get("/{ticker_id}", response_model=CustomTickerResponse)
def get_ticker(ticker_id: int, db: Session = Depends(get_db)):
    return registry.get_ticker(db, ticker_id)


@router.put("/{ticker_id}", response_model=CustomTickerResponse)
def update_ticker(
    ticker_id: int,
    payload: CustomTickerUpdate,
    db: Session = Depends(get_db),
):
    return registry.update_ticker(db, ticker_id, payload)


@router.delete("/{ticker_id}", response_model=CustomTickerResponse)
def delete_ticker(ticker_id: int, db: Session = Depends(get_db)):
    return registry.deactivate_ticker(db, ticker_id)

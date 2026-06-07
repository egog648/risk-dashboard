"""Custom ticker registry service."""
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.db_models import CustomTicker
from app.models.schemas import CustomTickerCreate, CustomTickerUpdate, ObjectiveKind
from app.services.data_fetchers.yfinance_client import validate_ticker_symbol


def _normalize_ticker(ticker: str) -> str:
    return ticker.strip().upper()


def _defaults_for_primary(primary: ObjectiveKind) -> tuple[float, float, float]:
    if primary == "growth":
        return 100.0, 0.0, 0.0
    if primary == "income":
        return 0.0, 100.0, 0.0
    return 0.0, 0.0, 100.0


def resolve_triangle_weights(
    primary: ObjectiveKind,
    growth_pct: float | None,
    income_pct: float | None,
    safety_pct: float | None,
) -> tuple[float, float, float]:
    if growth_pct is None and income_pct is None and safety_pct is None:
        return _defaults_for_primary(primary)

    if growth_pct is None or income_pct is None or safety_pct is None:
        raise HTTPException(
            status_code=422,
            detail="If specifying custom weights, provide growth_pct, income_pct, and safety_pct",
        )

    total = growth_pct + income_pct + safety_pct
    if abs(total - 100.0) > 0.01:
        raise HTTPException(
            status_code=422,
            detail=f"Triangle weights must sum to 100 (got {total:.2f})",
        )
    return growth_pct, income_pct, safety_pct


def list_tickers(
    db: Session,
    asset_class: str | None = None,
    primary_objective: str | None = None,
    include_inactive: bool = False,
) -> list[CustomTicker]:
    query = db.query(CustomTicker)
    if not include_inactive:
        query = query.filter(CustomTicker.is_active.is_(True))
    if asset_class:
        query = query.filter(CustomTicker.asset_class == asset_class)
    if primary_objective:
        query = query.filter(CustomTicker.primary_objective == primary_objective)
    return query.order_by(CustomTicker.ticker).all()


def get_ticker(db: Session, ticker_id: int) -> CustomTicker:
    row = db.query(CustomTicker).filter(CustomTicker.id == ticker_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Ticker not found")
    return row


def create_ticker(db: Session, payload: CustomTickerCreate) -> CustomTicker:
    symbol = _normalize_ticker(payload.ticker)
    existing = db.query(CustomTicker).filter(CustomTicker.ticker == symbol).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Ticker {symbol} already exists")

    g, i, s = resolve_triangle_weights(
        payload.primary_objective,
        payload.growth_pct,
        payload.income_pct,
        payload.safety_pct,
    )

    if not validate_ticker_symbol(symbol, db):
        raise HTTPException(status_code=422, detail=f"Ticker {symbol} not found or unavailable on Tiingo")

    row = CustomTicker(
        ticker=symbol,
        display_name=payload.display_name.strip(),
        asset_class=payload.asset_class,
        primary_objective=payload.primary_objective,
        growth_pct=g,
        income_pct=i,
        safety_pct=s,
        notes=payload.notes,
        risk_proxy_ticker=(
            _normalize_ticker(payload.risk_proxy_ticker) if payload.risk_proxy_ticker else None
        ),
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_ticker(db: Session, ticker_id: int, payload: CustomTickerUpdate) -> CustomTicker:
    row = get_ticker(db, ticker_id)
    data = payload.model_dump(exclude_unset=True)

    primary = data.get("primary_objective", row.primary_objective)
    if any(k in data for k in ("growth_pct", "income_pct", "safety_pct", "primary_objective")):
        g = data.get("growth_pct", row.growth_pct)
        i = data.get("income_pct", row.income_pct)
        s = data.get("safety_pct", row.safety_pct)
        if "primary_objective" in data and not any(
            k in data for k in ("growth_pct", "income_pct", "safety_pct")
        ):
            g, i, s = None, None, None
        g, i, s = resolve_triangle_weights(primary, g, i, s)
        row.growth_pct, row.income_pct, row.safety_pct = g, i, s
        row.primary_objective = primary

    for field in ("display_name", "asset_class", "notes", "is_active"):
        if field in data:
            setattr(row, field, data[field])

    if "risk_proxy_ticker" in data:
        proxy = data["risk_proxy_ticker"]
        row.risk_proxy_ticker = _normalize_ticker(proxy) if proxy else None

    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def deactivate_ticker(db: Session, ticker_id: int) -> CustomTicker:
    row = get_ticker(db, ticker_id)
    row.is_active = False
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row

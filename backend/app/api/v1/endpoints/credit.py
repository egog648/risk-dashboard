from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import AssetClassMetrics, YieldCurvePoint, YieldCurveResponse
from app.services.asset_classes.credit.corporate import CorporateBonds
from app.services.asset_classes.credit.government import GovernmentBonds
from app.services.data_fetchers.fred_client import fetch_series

router = APIRouter()


@router.get("/government", response_model=AssetClassMetrics)
def get_government(db: Session = Depends(get_db)):
    return GovernmentBonds().get_metrics(db)


@router.get("/corporate-ig", response_model=AssetClassMetrics)
def get_corporate_ig(db: Session = Depends(get_db)):
    return CorporateBonds(grade="ig").get_metrics(db)


@router.get("/corporate-hy", response_model=AssetClassMetrics)
def get_corporate_hy(db: Session = Depends(get_db)):
    return CorporateBonds(grade="hy").get_metrics(db)


@router.get("/all", response_model=list[AssetClassMetrics])
def get_all_credit(db: Session = Depends(get_db)):
    return [
        GovernmentBonds().get_metrics(db),
        CorporateBonds(grade="ig").get_metrics(db),
        CorporateBonds(grade="hy").get_metrics(db),
    ]


@router.get("/yield-curve", response_model=YieldCurveResponse)
def get_yield_curve(db: Session = Depends(get_db)):
    """Current US Treasury yield curve using FRED data."""
    TENORS = [
        ("DTB3",  "3M",  "3-Month"),
        ("DGS2",  "2Y",  "2-Year"),
        ("DGS10", "10Y", "10-Year"),
        ("DGS30", "30Y", "30-Year"),
    ]
    points = []
    missing_series = []
    for series_id, tenor, label in TENORS:
        s = fetch_series(series_id, db)
        if not s.empty:
            latest = float(s.dropna().iloc[-1])
            points.append(YieldCurvePoint(tenor=tenor, label=label, yield_pct=round(latest, 3)))
        else:
            missing_series.append(series_id)
    data_status = "ok"
    if points and missing_series:
        data_status = "partial"
    elif not points:
        data_status = "unavailable"
    return YieldCurveResponse(
        points=points,
        data_status=data_status,
        missing_series=missing_series,
        as_of=datetime.utcnow(),
    )

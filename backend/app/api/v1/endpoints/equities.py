from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import AssetClassMetrics
from app.services.asset_classes.equities.large_cap import LargeCapEquities
from app.services.asset_classes.equities.mid_cap import MidCapEquities
from app.services.asset_classes.equities.small_cap import SmallCapEquities
from app.services.data_fetchers.response_cache import get_cached, set_cached

router = APIRouter()

CACHE_PATH = "/equities/all"


@router.get("/large-cap", response_model=AssetClassMetrics)
def get_large_cap(db: Session = Depends(get_db)):
    return LargeCapEquities().get_metrics(db)


@router.get("/mid-cap", response_model=AssetClassMetrics)
def get_mid_cap(db: Session = Depends(get_db)):
    return MidCapEquities().get_metrics(db)


@router.get("/small-cap", response_model=AssetClassMetrics)
def get_small_cap(db: Session = Depends(get_db)):
    return SmallCapEquities().get_metrics(db)


@router.get("/all", response_model=list[AssetClassMetrics])
def get_all_equities(
    db: Session = Depends(get_db),
    include_history: bool = Query(default=False),
):
    cached = get_cached(CACHE_PATH, include_history)
    if cached is not None:
        return cached

    result = [
        LargeCapEquities().get_metrics(db, include_history=include_history),
        MidCapEquities().get_metrics(db, include_history=include_history),
        SmallCapEquities().get_metrics(db, include_history=include_history),
    ]
    set_cached(CACHE_PATH, include_history, result)
    return result

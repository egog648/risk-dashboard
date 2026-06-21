from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import AssetClassMetrics
from app.services.asset_classes.hard_assets.commodities import Commodities
from app.services.asset_classes.hard_assets.gold import Gold
from app.services.asset_classes.hard_assets.reits import REITs
from app.services.data_fetchers.response_cache import get_cached, set_cached

router = APIRouter()

CACHE_PATH = "/hard-assets/all"


@router.get("/gold", response_model=AssetClassMetrics)
def get_gold(db: Session = Depends(get_db)):
    return Gold().get_metrics(db)


@router.get("/reits", response_model=AssetClassMetrics)
def get_reits(db: Session = Depends(get_db)):
    return REITs().get_metrics(db)


@router.get("/commodities", response_model=AssetClassMetrics)
def get_commodities(db: Session = Depends(get_db)):
    return Commodities().get_metrics(db)


@router.get("/all", response_model=list[AssetClassMetrics])
def get_all_hard_assets(
    db: Session = Depends(get_db),
    include_history: bool = Query(default=False),
):
    cached = get_cached(CACHE_PATH, include_history)
    if cached is not None:
        return cached

    result = [
        Gold().get_metrics(db, include_history=include_history),
        REITs().get_metrics(db, include_history=include_history),
        Commodities().get_metrics(db, include_history=include_history),
    ]
    set_cached(CACHE_PATH, include_history, result)
    return result

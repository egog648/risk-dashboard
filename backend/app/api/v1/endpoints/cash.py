from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import AssetClassMetrics
from app.services.asset_classes.cash.money_market import MoneyMarket
from app.services.data_fetchers.response_cache import get_cached, set_cached

router = APIRouter()

CACHE_PATH = "/cash/all"


@router.get("/money-market", response_model=AssetClassMetrics)
def get_money_market(db: Session = Depends(get_db)):
    return MoneyMarket().get_metrics(db)


@router.get("/all", response_model=list[AssetClassMetrics])
def get_all_cash(
    db: Session = Depends(get_db),
    include_history: bool = Query(default=False),
):
    cached = get_cached(CACHE_PATH, include_history)
    if cached is not None:
        return cached

    result = [MoneyMarket().get_metrics(db, include_history=include_history)]
    set_cached(CACHE_PATH, include_history, result)
    return result

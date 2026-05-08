from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import AssetClassMetrics
from app.services.asset_classes.cash.money_market import MoneyMarket

router = APIRouter()


@router.get("/money-market", response_model=AssetClassMetrics)
def get_money_market(db: Session = Depends(get_db)):
    return MoneyMarket().get_metrics(db)


@router.get("/all", response_model=list[AssetClassMetrics])
def get_all_cash(db: Session = Depends(get_db)):
    return [MoneyMarket().get_metrics(db)]

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import AssetClassMetrics
from app.services.asset_classes.hard_assets.commodities import Commodities
from app.services.asset_classes.hard_assets.gold import Gold
from app.services.asset_classes.hard_assets.reits import REITs

router = APIRouter()


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
def get_all_hard_assets(db: Session = Depends(get_db)):
    return [
        Gold().get_metrics(db),
        REITs().get_metrics(db),
        Commodities().get_metrics(db),
    ]

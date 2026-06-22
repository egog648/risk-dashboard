from fastapi import APIRouter

from app.api.v1.endpoints import (
    cash,
    clients,
    credit,
    data_status,
    equities,
    hard_assets,
    portfolio,
    tickers,
)

api_router = APIRouter()

api_router.include_router(equities.router, prefix="/equities", tags=["Equities"])
api_router.include_router(credit.router, prefix="/credit", tags=["Credit"])
api_router.include_router(hard_assets.router, prefix="/hard-assets", tags=["Hard Assets"])
api_router.include_router(cash.router, prefix="/cash", tags=["Cash"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(data_status.router, prefix="/data-status", tags=["Data Status"])
api_router.include_router(tickers.router, prefix="/tickers", tags=["Tickers"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])

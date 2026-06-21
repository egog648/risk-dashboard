"""FRED API client with SQLite caching.

Fetches data once and caches it. On subsequent calls within the same day,
returns from the local DB instead of hitting FRED again.
"""
import logging
from datetime import datetime, timedelta

import pandas as pd
from fredapi import Fred
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.db_models import DataRefreshLog, TimeSeries
from app.services.data_fetchers.cache import get_cached, set_cached
from app.services.data_fetchers.series_store import upsert_time_series

logger = logging.getLogger(__name__)

# FRED series used across all asset classes
FRED_SERIES: dict[str, str] = {
    # Equities
    "SP500": "S&P 500 Index",
    "VIXCLS": "VIX Volatility Index",
    # Credit
    "DGS2": "2-Year Treasury Yield",
    "DGS10": "10-Year Treasury Yield",
    "DGS30": "30-Year Treasury Yield",
    "T10Y2Y": "10Y-2Y Yield Curve Spread",
    "BAMLH0A0HYM2": "HY Credit Spread (OAS)",
    "BAMLC0A0CM": "IG Credit Spread (OAS)",
    "FEDFUNDS": "Federal Funds Rate",
    # Hard Assets
    "CPIAUCSL": "CPI All Items",
    "T10YIE": "10-Year Breakeven Inflation",
    # Cash
    "DTB3": "3-Month Treasury Bill Rate",
}


def _get_fred() -> Fred:
    return Fred(api_key=settings.FRED_API_KEY)


def fetch_series(series_id: str, db: Session, lookback_years: int = 25) -> pd.Series:
    """Return a pandas Series for the given FRED series ID.

    Checks the DB cache first. If data is stale (older than 1 day), re-fetches.
    """
    cache_key = f"fred:{series_id}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached.copy()

    start_date = datetime.utcnow() - timedelta(days=365 * lookback_years)
    log = db.query(DataRefreshLog).filter_by(series_id=series_id, source="fred").first()

    if log and log.status == "ok":
        cutoff = datetime.utcnow() - timedelta(hours=23)
        if log.last_refreshed > cutoff:
            series = _load_from_db(series_id, db, start_date)
            set_cached(cache_key, series)
            return series

    series = _fetch_and_cache(series_id, db, start_date)
    set_cached(cache_key, series)
    return series


def _fetch_and_cache(series_id: str, db: Session, start_date: datetime) -> pd.Series:
    fred = _get_fred()
    try:
        raw: pd.Series = fred.get_series(series_id, observation_start=start_date)
        raw = raw.dropna()

        upsert_time_series(db, series_id, "fred", raw)

        # Update refresh log
        log = db.query(DataRefreshLog).filter_by(series_id=series_id, source="fred").first()
        if not log:
            log = DataRefreshLog(series_id=series_id, source="fred")
            db.add(log)
        log.last_refreshed = datetime.utcnow()
        log.status = "ok"
        log.error_message = None
        db.commit()

        logger.info("Fetched FRED series %s (%d points)", series_id, len(raw))
        return raw

    except Exception as exc:
        logger.error("Failed to fetch FRED series %s: %s", series_id, exc)
        _log_error(series_id, str(exc), db)
        db.commit()
        return _load_from_db(series_id, db, start_date)


def _load_from_db(series_id: str, db: Session, start_date: datetime) -> pd.Series:
    rows = (
        db.query(TimeSeries)
        .filter(
            TimeSeries.series_id == series_id,
            TimeSeries.source == "fred",
            TimeSeries.date >= start_date,
        )
        .order_by(TimeSeries.date)
        .all()
    )
    if not rows:
        return pd.Series(dtype=float)
    return pd.Series(
        {row.date: row.value for row in rows},
        dtype=float,
    )


def _log_error(series_id: str, message: str, db: Session):
    log = db.query(DataRefreshLog).filter_by(series_id=series_id, source="fred").first()
    if not log:
        log = DataRefreshLog(series_id=series_id, source="fred")
        db.add(log)
    log.last_refreshed = datetime.utcnow()
    log.status = "error"
    log.error_message = message

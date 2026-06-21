"""Yale Shiller CAPE dataset client with SQLite caching.

Source: http://www.econ.yale.edu/~shiller/data/ie_data.xls
Used to derive large-cap cyclically-adjusted earnings yield (1 / CAPE).
"""
import logging
from datetime import datetime, timedelta

import pandas as pd
import requests
from sqlalchemy.orm import Session

from app.models.db_models import DataRefreshLog, TimeSeries
from app.services.data_fetchers.cache import get_cached, set_cached
from app.services.data_fetchers.series_store import upsert_time_series
from app.services.data_fetchers.shiller_parser import parse_shiller_cape_series
from app.services.risk.return_assumptions import get_assumption

logger = logging.getLogger(__name__)

SHILLER_SERIES_ID = "SHILLER_CAPE"
SHILLER_SOURCE = "shiller"
SHILLER_URL = "http://www.econ.yale.edu/~shiller/data/ie_data.xls"


def cape_to_earnings_yield(cape: float) -> float:
    """Convert cyclically adjusted P/E (CAPE) to earnings yield."""
    if cape <= 0:
        raise ValueError("CAPE must be positive")
    return round(1.0 / cape, 6)


def fetch_shiller_cape(db: Session) -> pd.Series:
    """Return cached Shiller CAPE series, refreshing when stale."""
    cache_key = f"shiller:{SHILLER_SERIES_ID}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached.copy()

    start_date = datetime.utcnow() - timedelta(days=365 * 50)
    log = db.query(DataRefreshLog).filter_by(
        series_id=SHILLER_SERIES_ID,
        source=SHILLER_SOURCE,
    ).first()

    if log and log.status == "ok":
        cutoff = datetime.utcnow() - timedelta(hours=23)
        if log.last_refreshed > cutoff:
            series = _load_from_db(db, start_date)
            set_cached(cache_key, series)
            return series

    series = _fetch_and_cache(db, start_date)
    set_cached(cache_key, series)
    return series


def fetch_large_cap_earnings_yield(db: Session) -> tuple[float, datetime | None]:
    """Return large-cap earnings yield from latest CAPE, with registry fallback."""
    fallback = get_assumption("equity_earnings_yield_fallback", use_fallback=True)
    try:
        series = fetch_shiller_cape(db)
        if series.empty:
            return fallback, None
        latest_date = series.index[-1].to_pydatetime()
        return cape_to_earnings_yield(float(series.iloc[-1])), latest_date
    except Exception as exc:
        logger.warning("Shiller CAPE fetch failed, using fallback: %s", exc)
        return fallback, None


def _fetch_and_cache(db: Session, start_date: datetime) -> pd.Series:
    try:
        response = requests.get(SHILLER_URL, timeout=30)
        response.raise_for_status()
        series = parse_shiller_cape_series(response.content)
        upsert_time_series(db, SHILLER_SERIES_ID, SHILLER_SOURCE, series)

        log = db.query(DataRefreshLog).filter_by(
            series_id=SHILLER_SERIES_ID,
            source=SHILLER_SOURCE,
        ).first()
        if not log:
            log = DataRefreshLog(series_id=SHILLER_SERIES_ID, source=SHILLER_SOURCE)
            db.add(log)
        log.last_refreshed = datetime.utcnow()
        log.status = "ok"
        log.error_message = None
        db.commit()

        logger.info("Fetched Shiller CAPE (%d points)", len(series))
        return series.loc[series.index >= start_date]

    except Exception as exc:
        logger.error("Failed to fetch Shiller CAPE: %s", exc)
        _log_error(str(exc), db)
        db.commit()
        return _load_from_db(db, start_date)


def _load_from_db(db: Session, start_date: datetime) -> pd.Series:
    rows = (
        db.query(TimeSeries)
        .filter(
            TimeSeries.series_id == SHILLER_SERIES_ID,
            TimeSeries.source == SHILLER_SOURCE,
            TimeSeries.date >= start_date,
        )
        .order_by(TimeSeries.date)
        .all()
    )
    if not rows:
        return pd.Series(dtype=float)
    return pd.Series({row.date: row.value for row in rows}, dtype=float)


def _log_error(message: str, db: Session) -> None:
    log = db.query(DataRefreshLog).filter_by(
        series_id=SHILLER_SERIES_ID,
        source=SHILLER_SOURCE,
    ).first()
    if not log:
        log = DataRefreshLog(series_id=SHILLER_SERIES_ID, source=SHILLER_SOURCE)
        db.add(log)
    log.last_refreshed = datetime.utcnow()
    log.status = "error"
    log.error_message = message

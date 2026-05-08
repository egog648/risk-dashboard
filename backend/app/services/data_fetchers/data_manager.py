"""Orchestrates all data fetching jobs.

Called by the APScheduler on the configured cron schedule, and also
available as a manual trigger via the /api/v1/data-status/refresh endpoint.
"""
import logging

from app.core.database import SessionLocal
from app.services.data_fetchers.fred_client import FRED_SERIES, fetch_series
from app.services.data_fetchers.yfinance_client import YFINANCE_TICKERS, fetch_ticker

logger = logging.getLogger(__name__)


async def refresh_all_data():
    """Fetch and cache all FRED series and yfinance tickers."""
    logger.info("Starting full data refresh...")
    db = SessionLocal()
    try:
        # FRED series
        for series_id in FRED_SERIES:
            try:
                fetch_series(series_id, db)
            except Exception as exc:
                logger.error("Error refreshing FRED %s: %s", series_id, exc)

        # Market data tickers via Tiingo
        for ticker in YFINANCE_TICKERS:
            try:
                fetch_ticker(ticker, db)
            except Exception as exc:
                logger.error("Error refreshing ticker %s: %s", ticker, exc)

        logger.info("Full data refresh complete")
    finally:
        db.close()

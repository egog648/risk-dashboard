"""Orchestrates all data fetching jobs.

Called by the APScheduler on the configured cron schedule, and also
available as a manual trigger via the /api/v1/data-status/refresh endpoint.
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from app.core.database import SessionLocal
from app.services.data_fetchers.fred_client import FRED_SERIES, fetch_series
from app.services.data_fetchers.yfinance_client import YFINANCE_TICKERS, fetch_ticker

logger = logging.getLogger(__name__)

REFRESH_CONCURRENCY = 4


def _refresh_fred_series(series_id: str) -> None:
    db = SessionLocal()
    try:
        fetch_series(series_id, db)
    except Exception as exc:
        logger.error("Error refreshing FRED %s: %s", series_id, exc)
    finally:
        db.close()


def _refresh_ticker(ticker: str) -> None:
    db = SessionLocal()
    try:
        fetch_ticker(ticker, db)
    except Exception as exc:
        logger.error("Error refreshing ticker %s: %s", ticker, exc)
    finally:
        db.close()


async def refresh_all_data():
    """Fetch and cache all FRED series and yfinance tickers."""
    logger.info("Starting full data refresh...")
    loop = asyncio.get_running_loop()
    targets = list(FRED_SERIES.keys()) + list(YFINANCE_TICKERS.keys())

    with ThreadPoolExecutor(max_workers=REFRESH_CONCURRENCY) as pool:
        await asyncio.gather(
            *[
                loop.run_in_executor(
                    pool,
                    _refresh_fred_series if target in FRED_SERIES else _refresh_ticker,
                    target,
                )
                for target in targets
            ]
        )

    logger.info("Full data refresh complete")

"""Orchestrates all data fetching jobs.

Called by the APScheduler on the configured cron schedule, and also
available as a manual trigger via the /api/v1/data-status/refresh endpoint.
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.observability import (
    begin_refresh_run,
    complete_refresh_run,
    fail_refresh_run,
    record_series_result,
)
from app.services.data_fetchers.fred_client import FRED_SERIES, fetch_series
from app.services.data_fetchers.response_cache import invalidate_all
from app.services.data_fetchers.shiller_client import SHILLER_SERIES_ID, fetch_shiller_cape
from app.services.data_fetchers.yfinance_client import YFINANCE_TICKERS, fetch_ticker

logger = logging.getLogger(__name__)

REFRESH_CONCURRENCY = 4


def _refresh_fred_series(series_id: str) -> tuple[str, bool]:
    db = SessionLocal()
    try:
        fetch_series(series_id, db)
        return series_id, True
    except Exception as exc:
        logger.error("Error refreshing FRED %s: %s", series_id, exc)
        return series_id, False
    finally:
        db.close()


def _refresh_ticker(ticker: str) -> tuple[str, bool]:
    db = SessionLocal()
    try:
        fetch_ticker(ticker, db)
        return ticker, True
    except Exception as exc:
        logger.error("Error refreshing ticker %s: %s", ticker, exc)
        return ticker, False
    finally:
        db.close()


def _log_refresh_summary(summary) -> None:
    logger.info(
        "refresh_run_complete state=%s duration_ms=%s total=%s ok=%s errors=%s failed=%s",
        summary.state,
        summary.duration_ms,
        summary.total_series,
        summary.ok_count,
        summary.error_count,
        summary.failed_series,
    )
    if summary.total_series == 0:
        return
    error_ratio = summary.error_count / summary.total_series
    if summary.error_count > 0 or error_ratio >= settings.REFRESH_ERROR_WARN_RATIO:
        logger.warning(
            "refresh_run_errors error_count=%s total=%s ratio=%.2f threshold=%.2f failed=%s",
            summary.error_count,
            summary.total_series,
            error_ratio,
            settings.REFRESH_ERROR_WARN_RATIO,
            summary.failed_series,
        )


def _refresh_shiller_cape() -> tuple[str, bool]:
    db = SessionLocal()
    try:
        fetch_shiller_cape(db)
        return SHILLER_SERIES_ID, True
    except Exception as exc:
        logger.error("Error refreshing Shiller CAPE: %s", exc)
        return SHILLER_SERIES_ID, False
    finally:
        db.close()


def _refresh_target(target: str) -> tuple[str, bool]:
    if target == SHILLER_SERIES_ID:
        return _refresh_shiller_cape()
    if target in FRED_SERIES:
        return _refresh_fred_series(target)
    return _refresh_ticker(target)


async def refresh_all_data():
    """Fetch and cache all FRED series and yfinance tickers."""
    logger.info("Starting full data refresh...")
    targets = list(FRED_SERIES.keys()) + list(YFINANCE_TICKERS.keys()) + [SHILLER_SERIES_ID]
    begin_refresh_run(len(targets))

    try:
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor(max_workers=REFRESH_CONCURRENCY) as pool:
            results = await asyncio.gather(
                *[loop.run_in_executor(pool, _refresh_target, target) for target in targets]
            )

        for series_id, ok in results:
            record_series_result(series_id, ok)

        invalidate_all()
        summary = complete_refresh_run()
        _log_refresh_summary(summary)
        logger.info("Full data refresh complete")
    except Exception as exc:
        summary = fail_refresh_run(exc)
        _log_refresh_summary(summary)
        logger.exception("Full data refresh failed")
        raise

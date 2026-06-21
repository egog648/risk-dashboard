"""Market data client using Tiingo API with SQLite caching.

Tiingo provides free full-history daily adjusted prices for US ETFs.
Free tier: unlimited EOD requests, no call-rate issues for daily refresh.
Get a free key at: https://app.tiingo.com
"""
import logging
from datetime import datetime, timedelta

import pandas as pd
import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.db_models import DataRefreshLog, TimeSeries
from app.services.data_fetchers.cache import get_cached, set_cached
from app.services.data_fetchers.series_store import upsert_time_series

logger = logging.getLogger(__name__)

YFINANCE_TICKERS: dict[str, str] = {
    # Equities
    "SPY": "US Large Cap Equities (S&P 500)",
    "MDY": "US Mid Cap Equities (S&P 400)",
    "IWM": "US Small Cap Equities (Russell 2000)",
    # Credit
    "TLT": "Long-Term Government Bonds (20Y+ Treasuries)",
    "LQD": "Investment Grade Corporate Bonds",
    "HYG": "High Yield Corporate Bonds",
    # Hard Assets
    "GLD": "Gold",
    "VNQ": "US REITs",
    "DBC": "Broad Commodities (Invesco DB Commodity Index)",
    # Cash proxy
    "SHY": "Short-Term Treasury (1-3Y) / Cash Proxy",
}

_TIINGO_BASE = "https://api.tiingo.com/tiingo/daily"


def validate_ticker_symbol(ticker: str, db: Session) -> bool:
    """Return True if Tiingo can return price data for the symbol."""
    symbol = ticker.strip().upper()
    try:
        start_date = datetime.utcnow() - timedelta(days=365 * 2)
        series = _fetch_from_tiingo(symbol, start_date)
        return not series.empty
    except Exception as exc:
        logger.warning("Ticker validation failed for %s: %s", symbol, exc)
        return False


def fetch_ticker(ticker: str, db: Session, lookback_years: int = 25) -> pd.Series:
    """Return adjusted close price series for a ticker via Tiingo."""
    cache_key = f"ticker:{ticker}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached.copy()

    start_date = datetime.utcnow() - timedelta(days=365 * lookback_years)
    log = db.query(DataRefreshLog).filter_by(series_id=ticker, source="yfinance").first()

    if log and log.status == "ok":
        cutoff = datetime.utcnow() - timedelta(hours=23)
        if log.last_refreshed > cutoff:
            series = _load_from_db(ticker, db, start_date)
            set_cached(cache_key, series)
            return series

    series = _fetch_and_cache(ticker, db, start_date)
    set_cached(cache_key, series)
    return series


def _fetch_and_cache(ticker: str, db: Session, start_date: datetime) -> pd.Series:
    try:
        prices = _fetch_from_tiingo(ticker, start_date)

        upsert_time_series(db, ticker, "yfinance", prices)

        log = db.query(DataRefreshLog).filter_by(series_id=ticker, source="yfinance").first()
        if not log:
            log = DataRefreshLog(series_id=ticker, source="yfinance")
            db.add(log)
        log.last_refreshed = datetime.utcnow()
        log.status = "ok"
        log.error_message = None
        db.commit()

        logger.info("Fetched Tiingo ticker %s (%d points)", ticker, len(prices))
        return prices

    except Exception as exc:
        logger.error("Failed to fetch %s: %s", ticker, exc)
        _log_error(ticker, str(exc), db)
        db.commit()
        return _load_from_db(ticker, db, start_date)


def _fetch_from_tiingo(ticker: str, start_date: datetime) -> pd.Series:
    """Fetch full daily adjusted time series from Tiingo."""
    url = f"{_TIINGO_BASE}/{ticker.lower()}/prices"
    headers = {
        "Authorization": f"Token {settings.TIINGO_API_KEY}",
        "Content-Type": "application/json",
    }
    params = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "resampleFreq": "daily",
    }
    resp = requests.get(url, headers=headers, params=params, timeout=30)

    if resp.status_code == 404:
        raise ValueError(f"Ticker {ticker} not found on Tiingo")
    resp.raise_for_status()

    data = resp.json()
    if not data:
        raise ValueError(f"Tiingo returned empty data for {ticker}")

    series = pd.Series(
        {pd.Timestamp(row["date"]): float(row["adjClose"]) for row in data},
        dtype=float,
    )
    return series.sort_index()


def _load_from_db(ticker: str, db: Session, start_date: datetime) -> pd.Series:
    rows = (
        db.query(TimeSeries)
        .filter(
            TimeSeries.series_id == ticker,
            TimeSeries.source == "yfinance",
            TimeSeries.date >= start_date,
        )
        .order_by(TimeSeries.date)
        .all()
    )
    if not rows:
        return pd.Series(dtype=float)
    return pd.Series({row.date: row.value for row in rows}, dtype=float)


def _log_error(ticker: str, message: str, db: Session):
    log = db.query(DataRefreshLog).filter_by(series_id=ticker, source="yfinance").first()
    if not log:
        log = DataRefreshLog(series_id=ticker, source="yfinance")
        db.add(log)
    log.last_refreshed = datetime.utcnow()
    log.status = "error"
    log.error_message = message

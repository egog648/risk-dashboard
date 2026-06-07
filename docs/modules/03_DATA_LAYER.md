# Module 03 — Data Layer

## Goal
Fetch macro data from FRED and market proxy prices via a Tiingo-backed fetcher, cache in SQLite, and refresh daily.

## Files Involved
- `backend/app/services/data_fetchers/fred_client.py`
- `backend/app/services/data_fetchers/yfinance_client.py`
- `backend/app/services/data_fetchers/data_manager.py`
- `backend/app/models/db_models.py` (TimeSeries, DataRefreshLog tables)

## Data Sources

### FRED (Federal Reserve Economic Data)
Free API, no rate limit issues for this use case (120 req/day default).
Get your key: https://fred.stlouisfed.org/docs/api/api_key.html

Key series used (see `docs/reference/FRED_SERIES.md` for full list):
- `DGS10` — 10-year Treasury yield
- `VIXCLS` — VIX
- `BAMLH0A0HYM2` — HY credit spread
- `T10Y2Y` — Yield curve spread
- `CPIAUCSL` — CPI
- `DTB3` — 3-month T-bill

### Market Proxy Prices (Tiingo-backed fetcher)
Requires `TIINGO_API_KEY` in backend env.
Uses ETF proxies for asset class returns and includes retry logic with exponential backoff.

Key tickers:
- `SPY` (large cap), `MDY` (mid cap), `IWM` (small cap)
- `TLT` (govt bonds), `LQD` (IG corp), `HYG` (HY)
- `GLD` (gold), `VNQ` (REITs), `DBC` (commodities)
- `SHY` (cash proxy)

## Caching Logic

```
fetch_series(series_id, db):
  → Check DataRefreshLog: was this series fetched < 23 hours ago?
    YES → load from TimeSeries table (no network call)
    NO  → call provider API, save to DB, update log
```

## Initial Data Seed

On first run, trigger a full refresh:
```bash
curl -X POST http://localhost:8000/api/v1/data-status/refresh
```

This fetches ~25 years of history for all ~30 series. Takes 1-3 minutes.

## Daily Auto-Refresh

Configured via `DATA_REFRESH_CRON` in `.env` (default: `0 6 * * *` = 6am UTC).
APScheduler runs `refresh_all_data()` on the schedule.

## Check Data Status
```bash
curl http://localhost:8000/api/v1/data-status
```

Returns last refresh time and status for every series.

## Adding a New Data Series

### FRED series
1. Add to `FRED_SERIES` dict in `fred_client.py`:
   ```python
   "NEWSERIESID": "Description of series",
   ```
2. Use in any asset class module:
   ```python
   my_series = fetch_series("NEWSERIESID", db)
   ```

### Market proxy ticker
1. Add to `YFINANCE_TICKERS` dict in `yfinance_client.py`
2. Use: `fetch_ticker("MYTICKER", db)`

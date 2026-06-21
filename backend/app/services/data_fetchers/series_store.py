"""Upsert helpers for TimeSeries rows."""
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.models.db_models import TimeSeries


def _to_datetime(value) -> datetime:
    ts = pd.Timestamp(value)
    return ts.to_pydatetime()


def upsert_time_series(
    db: Session,
    series_id: str,
    source: str,
    series: pd.Series,
) -> None:
    """Replace overlapping tail rows and insert updated observations."""
    if series.empty:
        return

    series = series.dropna().sort_index()
    start_date = _to_datetime(series.index.min())

    db.query(TimeSeries).filter(
        TimeSeries.series_id == series_id,
        TimeSeries.source == source,
        TimeSeries.date >= start_date,
    ).delete(synchronize_session=False)

    records = [
        TimeSeries(
            series_id=series_id,
            source=source,
            date=_to_datetime(date),
            value=float(val),
        )
        for date, val in series.items()
    ]
    db.bulk_save_objects(records)

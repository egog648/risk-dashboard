from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TimeSeries(Base):
    """Stores cached macro data series from FRED and yfinance."""

    __tablename__ = "time_series"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    series_id: Mapped[str] = mapped_column(String(64), index=True)
    source: Mapped[str] = mapped_column(String(16))  # "fred" | "yfinance"
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    value: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DataRefreshLog(Base):
    """Tracks when each data series was last fetched."""

    __tablename__ = "data_refresh_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    series_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(16))
    last_refreshed: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(16), default="ok")  # "ok" | "error"
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

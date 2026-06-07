from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, Text
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


class CustomTicker(Base):
    """Advisor-curated implementation vehicles with G/I/S classification."""

    __tablename__ = "custom_tickers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(256))
    asset_class: Mapped[str] = mapped_column(String(32))  # equities | credit | hard_assets | cash
    primary_objective: Mapped[str] = mapped_column(String(16))  # growth | income | safety
    growth_pct: Mapped[float] = mapped_column(Float)
    income_pct: Mapped[float] = mapped_column(Float)
    safety_pct: Mapped[float] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_proxy_ticker: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

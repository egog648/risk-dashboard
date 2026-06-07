from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

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


class Client(Base):
    """Advisor client / investor record."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    profiles: Mapped[list["ClientProfile"]] = relationship(back_populates="client")
    portfolios: Mapped[list["Portfolio"]] = relationship(back_populates="client")


class ClientProfile(Base):
    """Versioned investment profiler result."""

    __tablename__ = "client_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    is_portfolio_override: Mapped[bool] = mapped_column(Boolean, default=False)
    answers_json: Mapped[str] = mapped_column(Text)  # JSON: {"q1":"A",...}
    growth_pct: Mapped[float] = mapped_column(Float)
    income_pct: Mapped[float] = mapped_column(Float)
    safety_pct: Mapped[float] = mapped_column(Float)
    raw_aggression_pct: Mapped[float] = mapped_column(Float)
    governed_aggression_pct: Mapped[float] = mapped_column(Float)
    governor_cap_pct: Mapped[float] = mapped_column(Float)
    profile_label: Mapped[str] = mapped_column(String(64))
    risk_label: Mapped[str] = mapped_column(String(64))
    questions_answered: Mapped[int] = mapped_column()
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    saved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    client: Mapped["Client"] = relationship(back_populates="profiles")


class Portfolio(Base):
    """Account or goal under a client."""

    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(256))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_override_id: Mapped[int | None] = mapped_column(
        ForeignKey("client_profiles.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    client: Mapped["Client"] = relationship(back_populates="portfolios")
    override_profile: Mapped["ClientProfile | None"] = relationship(foreign_keys=[profile_override_id])
    outlines: Mapped[list["PortfolioOutline"]] = relationship(back_populates="portfolio")


class PortfolioOutline(Base):
    """Generated portfolio allocation from a profile."""

    __tablename__ = "portfolio_outlines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("client_profiles.id", ondelete="CASCADE"), index=True
    )
    sleeve_allocation_json: Mapped[str] = mapped_column(Text)  # stocks/bonds/alts/cash
    weights_json: Mapped[str] = mapped_column(Text)  # PortfolioWeights
    vehicles_json: Mapped[str] = mapped_column(Text)
    narrative: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="outlines")
    profile: Mapped["ClientProfile"] = relationship()

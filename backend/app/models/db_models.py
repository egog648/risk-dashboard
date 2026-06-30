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
    portfolio_value_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    annual_income_need_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    annual_income_need_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
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
    holdings_snapshots: Mapped[list["HoldingsSnapshot"]] = relationship(back_populates="portfolio")
    derisk_assumptions: Mapped["DeriskAssumptions | None"] = relationship(
        back_populates="portfolio", uselist=False
    )
    derisk_runs: Mapped[list["DeriskAnalysisRun"]] = relationship(back_populates="portfolio")


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


class HoldingsSnapshot(Base):
    """Versioned lot-level holdings ingest for de-risk analysis."""

    __tablename__ = "holdings_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    statement_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="upload")
    total_value: Mapped[float] = mapped_column(Float)
    cash_value: Mapped[float] = mapped_column(Float, default=0.0)
    positions_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="holdings_snapshots")
    lots: Mapped[list["Lot"]] = relationship(back_populates="snapshot", cascade="all, delete-orphan")
    analysis_runs: Mapped[list["DeriskAnalysisRun"]] = relationship(back_populates="snapshot")


class Lot(Base):
    """Tax lot within a holdings snapshot."""

    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    snapshot_id: Mapped[int] = mapped_column(
        ForeignKey("holdings_snapshots.id", ondelete="CASCADE"), index=True
    )
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(256), default="")
    section: Mapped[str] = mapped_column(String(32), default="STOCKS")
    trade_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    holding_period: Mapped[str] = mapped_column(String(4), default="LT")
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    market_value: Mapped[float] = mapped_column(Float)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    unrealized_gl: Mapped[float] = mapped_column(Float, default=0.0)
    stress_beta: Mapped[float] = mapped_column(Float, default=1.0)
    raw_beta: Mapped[float | None] = mapped_column(Float, nullable=True)

    snapshot: Mapped["HoldingsSnapshot"] = relationship(back_populates="lots")


class DeriskAssumptions(Base):
    """Editable de-risk assumptions per portfolio."""

    __tablename__ = "derisk_assumptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), unique=True, index=True
    )
    tax_treatment: Mapped[str] = mapped_column(String(32), default="taxable_trust")
    tier_mode: Mapped[str] = mapped_column(String(16), default="tax_budget")
    fed_ltcg: Mapped[float] = mapped_column(Float, default=0.20)
    fed_stcg: Mapped[float] = mapped_column(Float, default=0.37)
    niit: Mapped[float] = mapped_column(Float, default=0.038)
    state_rate: Mapped[float] = mapped_column(Float, default=0.044)
    dd1: Mapped[float] = mapped_column(Float, default=0.20)
    dd2: Mapped[float] = mapped_column(Float, default=0.30)
    dd3: Mapped[float] = mapped_column(Float, default=0.40)
    dist_rate: Mapped[float] = mapped_column(Float, default=0.05)
    beta_floor: Mapped[float] = mapped_column(Float, default=0.35)
    beta_method: Mapped[str] = mapped_column(String(32), default="blume")
    tax_budgets_json: Mapped[str] = mapped_column(Text, default="[250000,500000,750000]")
    beta_targets_json: Mapped[str] = mapped_column(Text, default="[0.6,0.5,0.4]")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    portfolio: Mapped["Portfolio"] = relationship(back_populates="derisk_assumptions")


class DeriskAnalysisRun(Base):
    """Persisted de-risk analysis execution."""

    __tablename__ = "derisk_analysis_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    snapshot_id: Mapped[int] = mapped_column(
        ForeignKey("holdings_snapshots.id", ondelete="CASCADE"), index=True
    )
    assumptions_id: Mapped[int] = mapped_column(
        ForeignKey("derisk_assumptions.id", ondelete="CASCADE"), index=True
    )
    beta_before: Mapped[float] = mapped_column(Float)
    tiers_json: Mapped[str] = mapped_column(Text)
    sell_list_json: Mapped[str] = mapped_column(Text)
    decision_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="derisk_runs")
    snapshot: Mapped["HoldingsSnapshot"] = relationship(back_populates="analysis_runs")
    assumptions: Mapped["DeriskAssumptions"] = relationship()
    sell_tiers: Mapped[list["DeriskSellTier"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class DeriskSellTier(Base):
    """One tier row in the de-risk menu."""

    __tablename__ = "derisk_sell_tiers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("derisk_analysis_runs.id", ondelete="CASCADE"), index=True
    )
    tier_label: Mapped[str] = mapped_column(String(64))
    budget_or_target: Mapped[float] = mapped_column(Float)
    n_lots: Mapped[int] = mapped_column()
    proceeds: Mapped[float] = mapped_column(Float)
    gross_tax: Mapped[float] = mapped_column(Float)
    net_tax: Mapped[float] = mapped_column(Float)
    beta_after: Mapped[float] = mapped_column(Float)
    new_cash_pct: Mapped[float] = mapped_column(Float)
    runway_after: Mapped[float] = mapped_column(Float)
    protect_dd20: Mapped[float] = mapped_column(Float)
    protect_dd30: Mapped[float] = mapped_column(Float)
    protect_dd40: Mapped[float] = mapped_column(Float)
    tier_json: Mapped[str] = mapped_column(Text)

    run: Mapped["DeriskAnalysisRun"] = relationship(back_populates="sell_tiers")
    tier_lots: Mapped[list["DeriskSellTierLot"]] = relationship(
        back_populates="tier", cascade="all, delete-orphan"
    )


class DeriskSellTierLot(Base):
    """Lot included in a sell tier."""

    __tablename__ = "derisk_sell_tier_lots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tier_id: Mapped[int] = mapped_column(
        ForeignKey("derisk_sell_tiers.id", ondelete="CASCADE"), index=True
    )
    lot_id: Mapped[int | None] = mapped_column(
        ForeignKey("lots.id", ondelete="SET NULL"), nullable=True
    )
    entry_tier: Mapped[float] = mapped_column(Float)
    beta_dollars_removed: Mapped[float] = mapped_column(Float)
    tax_to_sell: Mapped[float] = mapped_column(Float)
    exposure_per_tax_dollar: Mapped[float | None] = mapped_column(Float, nullable=True)
    lot_json: Mapped[str] = mapped_column(Text)

    tier: Mapped["DeriskSellTier"] = relationship(back_populates="tier_lots")

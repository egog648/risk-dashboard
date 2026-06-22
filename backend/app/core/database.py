from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def _sqlite_file_path() -> Path | None:
    if not settings.DATABASE_URL.startswith("sqlite"):
        return None
    db_path = settings.DATABASE_URL.removeprefix("sqlite:///")
    if db_path == ":memory:":
        return None
    resolved = Path(db_path)
    if not resolved.is_absolute():
        resolved = Path.cwd() / resolved
    return resolved.resolve()


def _ensure_sqlite_directory() -> None:
    """Create parent directory for SQLite file paths (e.g. ./data/*.db)."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    resolved = _sqlite_file_path()
    if resolved is None:
        return

    resolved.parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_directory()

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite only
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_client_workspace_schema() -> None:
    """Lightweight schema patches for SQLite dev databases without Alembic."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "client_profiles" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("client_profiles")}
    with engine.begin() as conn:
        if "is_portfolio_override" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE client_profiles "
                    "ADD COLUMN is_portfolio_override BOOLEAN NOT NULL DEFAULT 0"
                )
            )

    if "portfolios" not in inspector.get_table_names():
        return

    portfolio_columns = {col["name"] for col in inspector.get_columns("portfolios")}
    with engine.begin() as conn:
        if "portfolio_value_usd" not in portfolio_columns:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN portfolio_value_usd FLOAT"))
        if "annual_income_need_usd" not in portfolio_columns:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN annual_income_need_usd FLOAT"))
        if "annual_income_need_pct" not in portfolio_columns:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN annual_income_need_pct FLOAT"))


def init_db():
    _ensure_sqlite_directory()
    from app.models import db_models  # noqa: F401 — ensures models are registered
    Base.metadata.create_all(bind=engine)
    _migrate_client_workspace_schema()

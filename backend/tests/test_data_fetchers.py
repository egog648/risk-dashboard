"""Integration tests for data fetchers (uses SQLite in-memory DB)."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_db_session_created(db):
    """Ensure the DB session is created without error."""
    assert db is not None


# NOTE: Live fetch tests (FRED/yfinance) require a real API key and network.
# Run these manually or in CI with secrets configured.
#
# def test_fetch_fred_series(db):
#     from app.services.data_fetchers.fred_client import fetch_series
#     result = fetch_series("DGS10", db)
#     assert not result.empty
#
# def test_fetch_yfinance_ticker(db):
#     from app.services.data_fetchers.yfinance_client import fetch_ticker
#     result = fetch_ticker("SPY", db)
#     assert not result.empty

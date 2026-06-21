"""Request-scoped fetch memoization tests."""
import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.services.data_fetchers import fred_client
from app.services.data_fetchers.cache import clear_request_cache, init_request_cache


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_fetch_series_uses_request_cache(db, monkeypatch):
    """Within a request cache scope, repeated fetches hit the memo once."""
    calls = {"count": 0}
    sample = pd.Series([1.0, 2.0], index=pd.date_range("2024-01-01", periods=2, freq="D"))

    def fake_fetch(series_id, session, start_date):
        calls["count"] += 1
        return sample

    monkeypatch.setattr(fred_client, "_fetch_and_cache", fake_fetch)

    init_request_cache()
    try:
        first = fred_client.fetch_series("DTB3", db)
        second = fred_client.fetch_series("DTB3", db)
    finally:
        clear_request_cache()

    assert calls["count"] == 1
    assert len(first) == len(second)
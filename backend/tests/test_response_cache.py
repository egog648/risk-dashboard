"""Tests for in-process response cache."""

from app.services.data_fetchers.response_cache import (
    get_cached,
    invalidate_all,
    set_cached,
)


def test_response_cache_hit_and_miss():
    invalidate_all()
    assert get_cached("/equities/all", False) is None

    set_cached("/equities/all", False, [{"sub_class": "large_cap"}])
    cached = get_cached("/equities/all", False)
    assert cached == [{"sub_class": "large_cap"}]

    assert get_cached("/equities/all", True) is None


def test_response_cache_invalidate_all():
    set_cached("/credit/all", False, [1, 2, 3])
    invalidate_all()
    assert get_cached("/credit/all", False) is None

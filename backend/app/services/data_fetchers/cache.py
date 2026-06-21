"""Request-scoped memoization for data fetchers."""
from contextvars import ContextVar

_request_cache: ContextVar[dict[str, object] | None] = ContextVar(
    "request_cache", default=None
)


def init_request_cache() -> None:
    _request_cache.set({})


def clear_request_cache() -> None:
    _request_cache.set(None)


def get_cached(key: str):
    cache = _request_cache.get()
    if cache is None:
        return None
    return cache.get(key)


def set_cached(key: str, value) -> None:
    cache = _request_cache.get()
    if cache is not None:
        cache[key] = value

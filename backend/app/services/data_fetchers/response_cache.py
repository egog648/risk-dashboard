"""In-process TTL cache for aggregate API responses."""

from __future__ import annotations

import threading
import time
from typing import Any

DEFAULT_TTL_SECONDS = 10 * 60

_lock = threading.Lock()
_cache: dict[str, tuple[float, Any]] = {}


def _cache_key(path: str, include_history: bool) -> str:
    return f"{path}?include_history={include_history}"


def get_cached(path: str, include_history: bool) -> Any | None:
    key = _cache_key(path, include_history)
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del _cache[key]
            return None
        return value


def set_cached(
    path: str,
    include_history: bool,
    value: Any,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> None:
    key = _cache_key(path, include_history)
    with _lock:
        _cache[key] = (time.monotonic() + ttl_seconds, value)


def invalidate_all() -> None:
    with _lock:
        _cache.clear()

"""In-memory observability metrics for data refresh runs."""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.models.schemas import RefreshRunSummary

MAX_FAILED_SERIES = 10


@dataclass
class _RefreshRunState:
    state: str = "idle"
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: float | None = None
    total_series: int = 0
    ok_count: int = 0
    error_count: int = 0
    failed_series: list[str] = field(default_factory=list)
    _perf_start: float | None = None


_lock = threading.Lock()
_run = _RefreshRunState()


def reset_refresh_run_metrics() -> None:
    """Reset metrics — intended for tests."""
    global _run
    with _lock:
        _run = _RefreshRunState()


def begin_refresh_run(total: int) -> None:
    with _lock:
        _run.state = "running"
        _run.started_at = datetime.now(UTC)
        _run.completed_at = None
        _run.duration_ms = None
        _run.total_series = total
        _run.ok_count = 0
        _run.error_count = 0
        _run.failed_series = []
        _run._perf_start = time.perf_counter()


def record_series_result(series_id: str, ok: bool) -> None:
    with _lock:
        if ok:
            _run.ok_count += 1
        else:
            _run.error_count += 1
            if len(_run.failed_series) < MAX_FAILED_SERIES:
                _run.failed_series.append(series_id)


def complete_refresh_run() -> RefreshRunSummary:
    with _lock:
        _run.state = "completed"
        _run.completed_at = datetime.now(UTC)
        if _run._perf_start is not None:
            _run.duration_ms = round((time.perf_counter() - _run._perf_start) * 1000, 2)
        return _build_summary()


def fail_refresh_run(exc: Exception) -> RefreshRunSummary:
    with _lock:
        _run.state = "failed"
        _run.completed_at = datetime.now(UTC)
        if _run._perf_start is not None:
            _run.duration_ms = round((time.perf_counter() - _run._perf_start) * 1000, 2)
        if str(exc) and len(_run.failed_series) < MAX_FAILED_SERIES:
            _run.failed_series.append(f"__run_error__:{exc}")
        return _build_summary()


def get_refresh_run_summary() -> RefreshRunSummary | None:
    with _lock:
        if _run.state == "idle" and _run.started_at is None:
            return None
        return _build_summary()


def _build_summary() -> RefreshRunSummary:
    return RefreshRunSummary(
        state=_run.state,  # type: ignore[arg-type]
        started_at=_run.started_at,
        completed_at=_run.completed_at,
        duration_ms=_run.duration_ms,
        total_series=_run.total_series,
        ok_count=_run.ok_count,
        error_count=_run.error_count,
        failed_series=list(_run.failed_series),
    )

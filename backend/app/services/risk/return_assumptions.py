"""Versioned expected-return assumptions registry."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

ASSUMPTIONS_PATH = Path(__file__).resolve().parents[2] / "data" / "return_assumptions.yaml"


@dataclass(frozen=True)
class AssumptionEntry:
    key: str
    value: float
    fallback: float
    source: str
    effective_date: str


@dataclass(frozen=True)
class ReturnAssumptionsRegistry:
    version: str
    entries: dict[str, AssumptionEntry]
    loaded_at: datetime


@lru_cache(maxsize=1)
def load_return_assumptions() -> ReturnAssumptionsRegistry:
    """Load and cache the assumptions YAML registry."""
    with ASSUMPTIONS_PATH.open(encoding="utf-8") as handle:
        raw: dict[str, Any] = yaml.safe_load(handle)

    entries: dict[str, AssumptionEntry] = {}
    for key, item in raw["assumptions"].items():
        entries[key] = AssumptionEntry(
            key=key,
            value=float(item["value"]),
            fallback=float(item.get("fallback", item["value"])),
            source=str(item["source"]),
            effective_date=str(item["effective_date"]),
        )

    return ReturnAssumptionsRegistry(
        version=str(raw["version"]),
        entries=entries,
        loaded_at=datetime.now(UTC),
    )


def get_assumption(key: str, *, use_fallback: bool = False) -> float:
    registry = load_return_assumptions()
    entry = registry.entries[key]
    return entry.fallback if use_fallback else entry.value


def get_assumptions_version() -> str:
    return load_return_assumptions().version


def get_assumptions_metadata() -> dict[str, str | datetime]:
    registry = load_return_assumptions()
    return {
        "assumptions_version": registry.version,
        "assumptions_as_of": registry.loaded_at,
    }

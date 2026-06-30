"""Broker-specific statement parsers (plugins).

Morgan Stanley parser to be ported when source files are available.
Use JSON upload (corrected_portfolio.json shape) or canonical CSV in the meantime.
"""

from typing import Any


def parse_morgan_stanley(content: bytes) -> dict[str, Any]:
    raise NotImplementedError(
        "Morgan Stanley parser not yet ported; use JSON or CSV upload."
    )

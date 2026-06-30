"""Parse brokerage uploads into normalized lot records."""

import csv
import io
import json
import re
from typing import Any

from app.services.derisk.risk import blume_adjusted_beta

# Canonical field -> accepted CSV header aliases (lowercase)
_CSV_ALIASES: dict[str, tuple[str, ...]] = {
    "ticker": (
        "ticker", "symbol", "sym", "security", "security symbol", "security_symbol",
        "security id", "security_id", "stock", "instrument", "product", "position",
    ),
    "quantity": (
        "quantity", "qty", "qty.", "shares", "share quantity", "share_quantity", "units",
        "no. of shares", "number of shares", "shares quantity", "qty (quantity)",
        "position quantity", "share qty", "shares held",
    ),
    "unit_cost": (
        "unit_cost", "unit cost", "cost per share", "cost_per_share", "average cost",
        "average_cost", "average cost basis", "cost basis per share", "cost/share",
    ),
    "total_cost": (
        "total_cost", "total cost", "cost basis", "cost_basis", "cost", "cost basis total",
    ),
    "trade_date": (
        "trade_date", "trade date", "date", "acquisition date", "acquisition_date",
        "purchase date", "date acquired",
    ),
    "holding_period": ("holding_period", "holding period", "term", "lt/st", "lt_st"),
    "current_price": (
        "current_price", "current price", "price", "market price", "market_price",
        "last price", "share price", "unit price",
    ),
    "market_value": (
        "market_value", "market value", "value", "current value", "current_value",
    ),
    "name": (
        "name", "description", "security name", "security_name", "security description",
    ),
    "section": ("section", "asset class", "asset_class", "type"),
}

_SUMMARY_LABELS = (
    "total", "subtotal", "grand total", "positions total", "account total",
    "cash total", "securities total", "investment total", "summary",
)
_TICKER_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")
_HEADERLESS_SYNTHETIC = (
    "Symbol", "Description", "Quantity", "Last Price", "Current Value", "Cost Basis Total",
)


def _register_header_keys(lowered: dict[str, str], header: str) -> None:
    """Index a CSV header under several normalized keys (Fidelity parenthetical labels)."""
    key = header.strip().lower()
    if not key:
        return
    lowered[key] = header
    lowered.setdefault(key.replace(" ", "_"), header)
    lowered.setdefault(key.replace("/", " "), header)
    lowered.setdefault(key.replace("/", "_"), header)
    paren = re.search(r"\(([^)]+)\)\s*$", key)
    if paren:
        inner = paren.group(1).strip()
        lowered[inner] = header
        lowered.setdefault(inner.replace(" ", "_"), header)
    if "/" in key:
        left, _, right = key.partition("/")
        if left.strip() and right.strip():
            lowered[f"{left.strip()}/{right.strip()}"] = header


def _canonical_field_map(fieldnames: list[str]) -> dict[str, str]:
    """Resolve canonical column names to the actual CSV header strings."""
    lowered: dict[str, str] = {}
    for h in fieldnames:
        if h:
            _register_header_keys(lowered, h)

    result: dict[str, str] = {}
    for canonical, aliases in _CSV_ALIASES.items():
        for alias in aliases:
            if alias in lowered:
                result[canonical] = lowered[alias]
                break
            alias_key = alias.replace(" ", "_")
            if alias_key in lowered:
                result[canonical] = lowered[alias_key]
                break
    return result


def _parse_number(raw: str) -> float:
    s = (raw or "").strip().replace(",", "").replace("$", "")
    if not s or s in ("-", "--", "—", "n/a", "na"):
        return 0.0
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    if s.endswith("%"):
        s = s[:-1]
    return float(s)


def _decode_csv_bytes(content: bytes) -> str:
    """Decode broker CSV exports (UTF-8, UTF-16 Excel, Windows-1252)."""
    if content.startswith(b"\xff\xfe") or content.startswith(b"\xfe\xff"):
        return content.decode("utf-16")
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def _is_summary_label(value: str) -> bool:
    label = (value or "").strip().lower()
    if not label:
        return False
    return any(token in label for token in _SUMMARY_LABELS)


def _looks_like_ticker(value: str) -> bool:
    token = (value or "").strip().upper()
    if not token or _is_summary_label(token):
        return False
    if token in ("SYMBOL", "TICKER", "CUSIP", "DESCRIPTION"):
        return False
    return bool(_TICKER_RE.match(token))


def _header_score(fieldnames: list[str]) -> int:
    field_map = _canonical_field_map(fieldnames)
    score = 0
    if "ticker" in field_map:
        score += 3
    if "quantity" in field_map:
        score += 3
    if "total_cost" in field_map or "unit_cost" in field_map:
        score += 1
    if "market_value" in field_map or "current_price" in field_map:
        score += 1
    first = (fieldnames[0] or "").strip()
    if _is_summary_label(first) or _looks_like_ticker(first):
        score -= 5
    return score


def _sniff_dialect(lines: list[str], start: int) -> csv.Dialect:
    try:
        sample = "\n".join(lines[start : min(start + 5, len(lines))])
        return csv.Sniffer().sniff(sample, delimiters=",\t;|")
    except csv.Error:
        return csv.excel


def _try_headerless_table(lines: list[str]) -> tuple[str, dict[str, str]] | None:
    """Broker exports sometimes omit a header row; infer from data rows."""
    for start in range(len(lines)):
        if not lines[start].strip():
            continue
        dialect = _sniff_dialect(lines, start)
        data_rows: list[list[str]] = []
        for line in lines[start:]:
            if not line.strip():
                continue
            row = next(csv.reader([line], dialect=dialect))
            if not row or _is_summary_label(row[0]):
                continue
            if not _looks_like_ticker(row[0]):
                continue
            if len(row) < 3:
                continue
            try:
                _parse_number(row[2])
            except ValueError:
                continue
            data_rows.append(row)

        if len(data_rows) < 1:
            continue

        ncols = max(len(r) for r in data_rows)
        headers = list(_HEADERLESS_SYNTHETIC)
        while len(headers) < ncols:
            headers.append(f"col_{len(headers)}")
        field_map = _canonical_field_map(headers)
        if "ticker" not in field_map or "quantity" not in field_map:
            continue

        out = io.StringIO()
        writer = csv.writer(out, dialect=dialect)
        writer.writerow(headers[:ncols])
        for row in data_rows:
            writer.writerow(row + [""] * (ncols - len(row)))
        return out.getvalue(), field_map

    return None


def _format_csv_not_found_error(lines: list[str], last_error: str) -> str:
    """Return actionable guidance when the upload is a summary export, not positions."""
    joined = "\n".join(lines[:10]).lower()
    if "positions total" in joined and not any(
        h in joined for h in ("symbol", "ticker", "quantity", "shares")
    ):
        return (
            "This file is a portfolio summary (totals only), not a positions list. "
            "It has no Symbol/Ticker or Quantity columns and no individual holdings. "
            "Re-export from your broker's Positions page with one row per holding "
            "(columns like Symbol, Description, Quantity, Cost Basis). "
            "On Fidelity: Positions tab → set view to Overview or All columns → Download CSV. "
            "Do not use Dividend View or copy only the totals row."
        )
    return last_error


def _locate_csv_table(text: str) -> tuple[str, dict[str, str]]:
    """Skip broker preamble rows; return CSV body text and field map."""
    lines = [ln for ln in text.splitlines() if ln is not None]
    last_error = "CSV file is empty or has no header row"
    best: tuple[int, str, dict[str, str]] | None = None

    for start in range(len(lines)):
        if not lines[start].strip():
            continue
        chunk = "\n".join(lines[start:])
        dialect = _sniff_dialect(lines, start)
        reader = csv.DictReader(io.StringIO(chunk), dialect=dialect)
        if not reader.fieldnames:
            continue

        fieldnames = [h or "" for h in reader.fieldnames]
        field_map = _canonical_field_map(fieldnames)
        score = _header_score(fieldnames)
        if score > (best[0] if best else -999):
            best = (score, chunk, field_map)

        if "ticker" in field_map and "quantity" in field_map and score >= 3:
            return chunk, field_map

        found = ", ".join(fieldnames)
        last_error = (
            "CSV must include ticker/symbol and quantity/shares columns. "
            f"Found: {found}. "
            "Export from your broker's Positions or Tax Lots page (not summary/Dividend View only)."
        )

    if best and best[0] >= 3:
        return best[1], best[2]

    headerless = _try_headerless_table(lines)
    if headerless:
        return headerless

    raise ValueError(_format_csv_not_found_error(lines, last_error))


def parse_json_portfolio(content: bytes) -> dict[str, Any]:
    """Parse corrected_portfolio.json shape."""
    data = json.loads(content.decode("utf-8"))
    if "positions" not in data or "summary" not in data:
        raise ValueError("JSON must include 'positions' and 'summary' keys")
    return data


def parse_csv_lots(content: bytes) -> dict[str, Any]:
    """Parse canonical CSV: ticker/symbol, quantity/shares, cost, dates, etc."""
    text = _decode_csv_bytes(content)
    table_text, field_map = _locate_csv_table(text)
    dialect = _sniff_dialect(table_text.splitlines(), 0)
    reader = csv.DictReader(io.StringIO(table_text), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError("CSV file is empty or has no header row")

    def col(row: dict, name: str, default: str = "") -> str:
        key = field_map.get(name, name)
        return (row.get(key) or default).strip()

    positions_map: dict[str, dict] = {}
    for row in reader:
        ticker = col(row, "ticker").upper()
        if not ticker or ticker in ("SYMBOL", "TICKER", "TOTAL") or _is_summary_label(ticker):
            continue
        if "CASH" in ticker and "INVESTMENT" in ticker:
            continue
        try:
            qty = _parse_number(col(row, "quantity", "0"))
            if qty <= 0:
                continue
            unit_cost = _parse_number(col(row, "unit_cost", "0") or col(row, "total_cost", "0"))
            if unit_cost and qty and "unit_cost" not in field_map and "total_cost" in field_map:
                unit_cost = unit_cost / qty if qty else 0
            total_cost = _parse_number(col(row, "total_cost", "0") or str(qty * unit_cost))
            price = _parse_number(col(row, "current_price", "0"))
            mv = _parse_number(col(row, "market_value", "0") or (str(qty * price) if price else "0"))
        except ValueError as exc:
            raise ValueError(f"Invalid number in row for {ticker}: {exc}") from exc
        lot = {
            "trade_date": col(row, "trade_date") or None,
            "quantity": qty,
            "unit_cost": unit_cost,
            "total_cost": total_cost or qty * unit_cost,
            "holding_period": (col(row, "holding_period", "LT") or "LT").upper()[:2],
        }
        if ticker not in positions_map:
            positions_map[ticker] = {
                "ticker": ticker,
                "name": col(row, "name", ticker),
                "section": col(row, "section", "STOCKS") or "STOCKS",
                "current_price": price or None,
                "market_value": 0.0,
                "lots": [],
            }
        positions_map[ticker]["lots"].append(lot)

    positions = []
    securities_mv = 0.0
    for pos in positions_map.values():
        pos_mv = sum(
            lot.get("quantity", 0) * (pos.get("current_price") or 0)
            if pos.get("current_price")
            else lot.get("total_cost", 0)
            for lot in pos["lots"]
        )
        for lot in pos["lots"]:
            if pos.get("current_price"):
                lot_mv = lot["quantity"] * pos["current_price"]
            else:
                lot_mv = lot.get("total_cost", 0)
            lot["market_value"] = lot_mv
        pos["market_value"] = pos_mv
        securities_mv += pos_mv
        positions.append(pos)

    cash = 0.0
    total = securities_mv + cash
    return {
        "summary": {
            "statement_date": None,
            "grand_total_current": total,
            "cash_mv": cash,
            "securities_mv_current": securities_mv,
        },
        "positions": positions,
    }


def extract_lots_from_portfolio(
    portfolio_data: dict[str, Any],
    beta_floor: float = 0.35,
) -> tuple[list[dict[str, Any]], dict[str, float], dict[str, Any]]:
    """Flatten positions into lot dicts and stress beta map."""
    summary = portfolio_data["summary"]
    stress_betas: dict[str, float] = {}
    lots: list[dict[str, Any]] = []

    for pos in portfolio_data.get("positions", []):
        if pos.get("section") == "MONEY_MARKET":
            continue
        ticker = pos["ticker"]
        raw = pos.get("raw_beta")
        if "stress_beta" in pos:
            stress_betas[ticker] = pos["stress_beta"]
        elif raw is not None:
            stress_betas[ticker] = blume_adjusted_beta(raw, beta_floor)
        else:
            stress_betas[ticker] = 1.0

        cur_px = pos.get("current_price") or 0
        for lot in pos.get("lots", []):
            qty = lot.get("quantity") or 0
            tc = lot.get("total_cost") or (qty * (lot.get("unit_cost") or 0))
            mv = lot.get("market_value") or (qty * cur_px if cur_px else tc)
            gl = mv - tc
            lots.append(
                {
                    "ticker": ticker,
                    "name": pos.get("name", ticker),
                    "section": pos.get("section", "STOCKS"),
                    "trade_date": lot.get("trade_date"),
                    "holding_period": lot.get("holding_period", "LT"),
                    "quantity": qty,
                    "market_value": round(mv, 2),
                    "total_cost": round(tc, 2),
                    "unrealized_gl": round(gl, 2),
                    "unrealized_gl_pct": round(gl / tc * 100, 2) if tc else None,
                    "stress_beta": stress_betas[ticker],
                    "raw_beta": raw,
                }
            )

    return lots, stress_betas, summary

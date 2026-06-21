"""Match client profile triangle to custom ticker registry vehicles."""
import math

from sqlalchemy.orm import Session

from app.models.db_models import CustomTicker
from app.models.schemas import AssetClassKind, TickerRecommendation
from app.services.tickers import registry


def _cosine_similarity(
    profile: tuple[float, float, float],
    ticker: tuple[float, float, float],
) -> float:
    dot = sum(a * b for a, b in zip(profile, ticker, strict=True))
    mag_profile = math.sqrt(sum(v * v for v in profile))
    mag_ticker = math.sqrt(sum(v * v for v in ticker))
    if mag_profile == 0 or mag_ticker == 0:
        return 0.0
    return dot / (mag_profile * mag_ticker)


def _dominant_objective(growth_pct: float, income_pct: float, safety_pct: float) -> str:
    values = {"growth": growth_pct, "income": income_pct, "safety": safety_pct}
    return max(values, key=values.get)  # type: ignore[arg-type]


def _build_rationale(
    row: CustomTicker,
    dominant: str,
    aggression: float,
    boosted: bool,
) -> str:
    parts = [
        f"G/I/S alignment ({row.growth_pct:.0f}/{row.income_pct:.0f}/{row.safety_pct:.0f})",
    ]
    if row.primary_objective == dominant:
        parts.append(f"matches dominant {dominant} objective")
    if boosted:
        parts.append("income-equity fit for elevated aggression")
    if row.notes:
        parts.append(row.notes)
    return "; ".join(parts)


def _score_ticker(
    row: CustomTicker,
    profile: tuple[float, float, float],
    dominant: str,
    aggression: float,
    asset_class: AssetClassKind,
) -> tuple[float, str]:
    ticker_vec = (row.growth_pct, row.income_pct, row.safety_pct)
    base = _cosine_similarity(profile, ticker_vec) * 100.0

    if row.primary_objective == dominant:
        base *= 1.10

    boosted = (
        aggression >= 55
        and asset_class == "equities"
        and row.primary_objective == "income"
    )
    if boosted:
        base *= 1.05

    score = min(round(base, 1), 100.0)
    rationale = _build_rationale(row, dominant, aggression, boosted)
    return score, rationale


def recommend_tickers(
    db: Session,
    *,
    growth_pct: float,
    income_pct: float,
    safety_pct: float,
    aggression: float,
    asset_class: AssetClassKind,
    limit: int = 5,
) -> list[TickerRecommendation]:
    total = growth_pct + income_pct + safety_pct
    if abs(total - 100.0) > 0.01:
        raise ValueError(f"Profile triangle must sum to 100 (got {total:.2f})")

    profile = (growth_pct, income_pct, safety_pct)
    dominant = _dominant_objective(growth_pct, income_pct, safety_pct)
    rows = registry.list_tickers(db, asset_class=asset_class)

    scored: list[tuple[float, CustomTicker, str]] = []
    for row in rows:
        score, rationale = _score_ticker(row, profile, dominant, aggression, asset_class)
        scored.append((score, row, rationale))

    scored.sort(key=lambda item: item[0], reverse=True)
    top = scored[:limit]

    return [
        TickerRecommendation(
            ticker=row.ticker,
            display_name=row.display_name,
            asset_class=row.asset_class,  # type: ignore[arg-type]
            primary_objective=row.primary_objective,  # type: ignore[arg-type]
            match_score=score,
            rationale=rationale,
        )
        for score, row, rationale in top
    ]

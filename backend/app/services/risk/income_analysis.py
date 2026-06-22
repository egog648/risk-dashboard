"""Portfolio income yield estimates and adequacy gap analysis."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.schemas import IncomeAdequacyResult, PortfolioWeights
from app.services.data_fetchers.shiller_client import fetch_large_cap_earnings_yield
from app.services.data_fetchers.yfinance_client import fetch_trailing_dividend_yield
from app.services.risk.expected_returns import CANONICAL_WEIGHT_KEYS, fetch_macro_context
from app.services.risk.return_assumptions import get_assumption


def build_income_yield_by_bucket(db: Session) -> dict[str, float]:
  """Approximate income yield per optimizer bucket (decimal, not percent)."""
  macro = fetch_macro_context(db)
  large_ey = fetch_large_cap_earnings_yield(db)
  if large_ey is None:
    large_ey = get_assumption("equity_earnings_yield_fallback", use_fallback=True)

  mid_premium = get_assumption("equity_size_premium_mid", use_fallback=True)
  small_premium = get_assumption("equity_size_premium_small", use_fallback=True)

  reit_yield = fetch_trailing_dividend_yield("VNQ", db)
  if reit_yield is None:
    reit_yield = get_assumption("reit_dividend_yield_fallback", use_fallback=True)

  return {
    "equities_large": large_ey,
    "equities_mid": large_ey + mid_premium,
    "equities_small": large_ey + small_premium,
    "credit_government": macro.ytm_10y * 0.85,
    "credit_corporate_ig": get_assumption("income_yield_credit_ig", use_fallback=True),
    "credit_corporate_hy": get_assumption("income_yield_credit_hy", use_fallback=True),
    "hard_assets_reits": reit_yield,
    "hard_assets_gold": get_assumption("income_yield_gold", use_fallback=True),
    "hard_assets_commodities": get_assumption("income_yield_commodities", use_fallback=True),
    "cash": macro.risk_free,
  }


def compute_portfolio_yield(
  weights: dict[str, float],
  yields: dict[str, float],
) -> float:
  total = 0.0
  for key in CANONICAL_WEIGHT_KEYS:
    total += weights.get(key, 0.0) * yields.get(key, 0.0)
  return round(total, 4)


def compute_income_adequacy(
  weights: PortfolioWeights | dict[str, float],
  yields: dict[str, float],
  portfolio_value_usd: float | None,
  annual_income_need_usd: float | None,
  annual_income_need_pct: float | None,
) -> IncomeAdequacyResult:
  weights_dict = weights.model_dump() if hasattr(weights, "model_dump") else dict(weights)
  portfolio_yield = compute_portfolio_yield(weights_dict, yields)

  if portfolio_value_usd is None or portfolio_value_usd <= 0:
    return IncomeAdequacyResult(
      portfolio_yield=portfolio_yield,
      annual_income_estimate=None,
      annual_income_need=None,
      gap_usd=None,
      gap_pct=None,
      status="unknown",
    )

  annual_income_estimate = round(portfolio_value_usd * portfolio_yield, 2)

  if annual_income_need_usd is not None and annual_income_need_usd > 0:
    need = annual_income_need_usd
  elif annual_income_need_pct is not None and annual_income_need_pct > 0:
    need = round(portfolio_value_usd * (annual_income_need_pct / 100), 2)
  else:
    return IncomeAdequacyResult(
      portfolio_yield=portfolio_yield,
      annual_income_estimate=annual_income_estimate,
      annual_income_need=None,
      gap_usd=None,
      gap_pct=None,
      status="unknown",
    )

  gap_usd = round(annual_income_estimate - need, 2)
  gap_pct = round((gap_usd / need) * 100, 2) if need > 0 else None
  status = "adequate" if gap_usd >= 0 else "shortfall"

  return IncomeAdequacyResult(
    portfolio_yield=portfolio_yield,
    annual_income_estimate=annual_income_estimate,
    annual_income_need=need,
    gap_usd=gap_usd,
    gap_pct=gap_pct,
    status=status,
  )

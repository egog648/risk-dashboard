from app.models.schemas import PortfolioWeights
from app.services.risk.income_analysis import compute_income_adequacy, compute_portfolio_yield


def test_compute_portfolio_yield_weighted():
    weights = {
        "equities_large": 0.5,
        "equities_mid": 0.0,
        "equities_small": 0.0,
        "credit_government": 0.5,
        "credit_corporate_ig": 0.0,
        "credit_corporate_hy": 0.0,
        "hard_assets_gold": 0.0,
        "hard_assets_reits": 0.0,
        "hard_assets_commodities": 0.0,
        "cash": 0.0,
    }
    yields = {
        "equities_large": 0.04,
        "credit_government": 0.03,
    }
    assert compute_portfolio_yield(weights, yields) == 0.035


def test_income_adequacy_shortfall():
    weights = PortfolioWeights(
        equities_large=0.0,
        equities_mid=0.0,
        equities_small=0.0,
        credit_government=0.0,
        credit_corporate_ig=0.0,
        credit_corporate_hy=0.0,
        hard_assets_gold=0.0,
        hard_assets_reits=0.0,
        hard_assets_commodities=0.0,
        cash=1.0,
    )
    yields = {k: 0.04 for k in weights.model_dump()}
    result = compute_income_adequacy(
        weights,
        yields,
        portfolio_value_usd=1_000_000,
        annual_income_need_usd=50_000,
        annual_income_need_pct=None,
    )
    assert result.status == "shortfall"
    assert result.gap_usd == -10_000


def test_income_adequacy_unknown_without_metadata():
    weights = PortfolioWeights()
    yields = {k: 0.04 for k in weights.model_dump()}
    result = compute_income_adequacy(weights, yields, None, None, None)
    assert result.status == "unknown"


def test_income_adequacy_pct_need():
    weights = PortfolioWeights(
        equities_large=0.0,
        equities_mid=0.0,
        equities_small=0.0,
        credit_government=0.0,
        credit_corporate_ig=0.0,
        credit_corporate_hy=0.0,
        hard_assets_gold=0.0,
        hard_assets_reits=0.0,
        hard_assets_commodities=0.0,
        cash=1.0,
    )
    yields = {k: 0.05 for k in weights.model_dump()}
    result = compute_income_adequacy(
        weights,
        yields,
        portfolio_value_usd=1_000_000,
        annual_income_need_usd=None,
        annual_income_need_pct=4.0,
    )
    assert result.status == "adequate"
    assert result.annual_income_need == 40_000

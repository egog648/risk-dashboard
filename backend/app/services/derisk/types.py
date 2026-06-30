"""Shared types for the de-risk engine."""

from dataclasses import dataclass, field


@dataclass
class DeriskAssumptionsConfig:
    """Editable assumptions driving tax, tiers, and drawdown math."""

    tax_treatment: str = "taxable_trust"
    tier_mode: str = "tax_budget"  # tax_budget | beta_target

    fed_ltcg: float = 0.20
    fed_stcg: float = 0.37
    niit: float = 0.038
    state_rate: float = 0.044

    dd1: float = 0.20
    dd2: float = 0.30
    dd3: float = 0.40
    dist_rate: float = 0.05
    beta_floor: float = 0.35
    beta_method: str = "blume"

    tax_budgets: list[float] = field(default_factory=lambda: [250_000.0, 500_000.0, 750_000.0])
    beta_targets: list[float] = field(default_factory=lambda: [0.60, 0.50, 0.40])

    @property
    def lt_rate(self) -> float:
        if self.tier_mode == "beta_target" or self.tax_treatment in (
            "traditional_ira",
            "roth_ira",
            "401k",
        ):
            return 0.0
        return self.fed_ltcg + self.niit + self.state_rate

    @property
    def st_rate(self) -> float:
        if self.tier_mode == "beta_target" or self.tax_treatment in (
            "traditional_ira",
            "roth_ira",
            "401k",
        ):
            return 0.0
        return self.fed_stcg + self.niit + self.state_rate

    @property
    def drawdowns(self) -> list[float]:
        return [self.dd1, self.dd2, self.dd3]

    @property
    def drawdown_pcts(self) -> list[int]:
        return [int(d * 100) for d in self.drawdowns]


@dataclass
class PortfolioSummary:
    total: float
    cash: float

    @property
    def equity(self) -> float:
        return self.total - self.cash

    def distribution(self, dist_rate: float) -> float:
        return dist_rate * self.total


def default_assumptions_for_treatment(tax_treatment: str) -> DeriskAssumptionsConfig:
    non_taxable = tax_treatment in ("traditional_ira", "roth_ira", "401k")
    if non_taxable:
        return DeriskAssumptionsConfig(
            tax_treatment=tax_treatment,
            tier_mode="beta_target",
            fed_ltcg=0.0,
            fed_stcg=0.0,
            niit=0.0,
            state_rate=0.0,
        )
    return DeriskAssumptionsConfig(tax_treatment=tax_treatment, tier_mode="tax_budget")

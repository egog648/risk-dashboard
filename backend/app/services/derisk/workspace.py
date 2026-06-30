"""De-risk workspace: persistence, assumptions, analysis runs."""

import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.models.db_models import (
    Client,
    DeriskAnalysisRun,
    DeriskAssumptions,
    DeriskSellTier,
    DeriskSellTierLot,
    HoldingsSnapshot,
    Lot,
    Portfolio,
)
from app.models.schemas import (
    DeRiskClientPortfolioOption,
    DeriskAssumptionsResponse,
    DeriskAssumptionsUpdate,
    DeriskAnalysisRunResponse,
    DeriskLotsResponse,
    DeriskSellListResponse,
    DeriskTiersResponse,
    HoldingsSnapshotResponse,
    LotResponse,
)
from app.services.derisk.ingestion import (
    _decode_csv_bytes,
    extract_lots_from_portfolio,
    parse_csv_lots,
    parse_json_portfolio,
)
from app.services.derisk.runner import run_analysis
from app.services.derisk.types import DeriskAssumptionsConfig, PortfolioSummary, default_assumptions_for_treatment


def _loads_list(raw: str) -> list[float]:
    return json.loads(raw)


def _dumps_list(values: list[float]) -> str:
    return json.dumps(values)


def assumptions_to_config(row: DeriskAssumptions) -> DeriskAssumptionsConfig:
    return DeriskAssumptionsConfig(
        tax_treatment=row.tax_treatment,
        tier_mode=row.tier_mode,
        fed_ltcg=row.fed_ltcg,
        fed_stcg=row.fed_stcg,
        niit=row.niit,
        state_rate=row.state_rate,
        dd1=row.dd1,
        dd2=row.dd2,
        dd3=row.dd3,
        dist_rate=row.dist_rate,
        beta_floor=row.beta_floor,
        beta_method=row.beta_method,
        tax_budgets=_loads_list(row.tax_budgets_json),
        beta_targets=_loads_list(row.beta_targets_json),
    )


def assumptions_to_response(row: DeriskAssumptions) -> DeriskAssumptionsResponse:
    cfg = assumptions_to_config(row)
    return DeriskAssumptionsResponse(
        id=row.id,
        portfolio_id=row.portfolio_id,
        tax_treatment=row.tax_treatment,
        tier_mode=row.tier_mode,
        fed_ltcg=row.fed_ltcg,
        fed_stcg=row.fed_stcg,
        niit=row.niit,
        state_rate=row.state_rate,
        dd1=row.dd1,
        dd2=row.dd2,
        dd3=row.dd3,
        dist_rate=row.dist_rate,
        beta_floor=row.beta_floor,
        beta_method=row.beta_method,
        tax_budgets=_loads_list(row.tax_budgets_json),
        beta_targets=_loads_list(row.beta_targets_json),
        lt_rate=cfg.lt_rate,
        st_rate=cfg.st_rate,
        updated_at=row.updated_at,
    )


def _get_portfolio(db: Session, portfolio_id: int) -> Portfolio:
    portfolio = db.get(Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


def get_or_create_assumptions(
    db: Session, portfolio_id: int, tax_treatment: str = "taxable_trust"
) -> DeriskAssumptions:
    row = db.scalar(
        select(DeriskAssumptions).where(DeriskAssumptions.portfolio_id == portfolio_id)
    )
    if row:
        return row
    defaults = default_assumptions_for_treatment(tax_treatment)
    row = DeriskAssumptions(
        portfolio_id=portfolio_id,
        tax_treatment=defaults.tax_treatment,
        tier_mode=defaults.tier_mode,
        fed_ltcg=defaults.fed_ltcg,
        fed_stcg=defaults.fed_stcg,
        niit=defaults.niit,
        state_rate=defaults.state_rate,
        dd1=defaults.dd1,
        dd2=defaults.dd2,
        dd3=defaults.dd3,
        dist_rate=defaults.dist_rate,
        beta_floor=defaults.beta_floor,
        beta_method=defaults.beta_method,
        tax_budgets_json=_dumps_list(defaults.tax_budgets),
        beta_targets_json=_dumps_list(defaults.beta_targets),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_assumptions(db: Session, portfolio_id: int) -> DeriskAssumptionsResponse:
    _get_portfolio(db, portfolio_id)
    row = get_or_create_assumptions(db, portfolio_id)
    return assumptions_to_response(row)


def update_assumptions(
    db: Session, portfolio_id: int, payload: DeriskAssumptionsUpdate
) -> DeriskAssumptionsResponse:
    row = get_or_create_assumptions(db, portfolio_id)
    data = payload.model_dump(exclude_unset=True)
    tax_budgets = data.pop("tax_budgets", None)
    beta_targets = data.pop("beta_targets", None)
    for key, value in data.items():
        setattr(row, key, value)
    if tax_budgets is not None:
        row.tax_budgets_json = _dumps_list(tax_budgets)
    if beta_targets is not None:
        row.beta_targets_json = _dumps_list(beta_targets)
    if payload.tax_treatment and payload.tier_mode is None:
        defaults = default_assumptions_for_treatment(payload.tax_treatment)
        row.tier_mode = defaults.tier_mode
        if defaults.tier_mode == "beta_target":
            row.fed_ltcg = 0.0
            row.fed_stcg = 0.0
            row.niit = 0.0
            row.state_rate = 0.0
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return assumptions_to_response(row)


def _looks_like_csv(content: bytes) -> bool:
    stripped = content.lstrip()
    if not stripped or stripped.startswith((b"{", b"[")):
        return False
    try:
        text = _decode_csv_bytes(content)[:4096]
    except Exception:
        return False
    return "," in text or "\t" in text or ";" in text


def _parse_upload_content(content: bytes, filename: str) -> tuple[dict, str]:
    """Detect JSON vs CSV from extension and content."""
    lower = filename.lower()
    stripped = content.lstrip()

    if lower.endswith(".json") or stripped.startswith((b"{", b"[")):
        try:
            return parse_json_portfolio(content), "json"
        except (json.JSONDecodeError, ValueError):
            if lower.endswith(".json"):
                raise

    if lower.endswith(".csv") or lower.endswith(".txt") or _looks_like_csv(content):
        return parse_csv_lots(content), "csv"

    try:
        return parse_json_portfolio(content), "json"
    except (json.JSONDecodeError, ValueError):
        pass

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Upload a .csv or .json positions export with Symbol and Quantity columns.",
    )


def upload_holdings(
    db: Session,
    portfolio_id: int,
    content: bytes,
    filename: str,
    source: str | None = None,
) -> HoldingsSnapshotResponse:
    _get_portfolio(db, portfolio_id)
    assumptions = get_or_create_assumptions(db, portfolio_id)

    try:
        portfolio_data, detected = _parse_upload_content(content, filename)
        src = source or detected
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {type(exc).__name__}: {exc}") from exc

    lots_data, stress_betas, summary = extract_lots_from_portfolio(
        portfolio_data, beta_floor=assumptions.beta_floor
    )
    if not lots_data:
        raise HTTPException(status_code=400, detail="No lots found in upload")

    snapshot = HoldingsSnapshot(
        portfolio_id=portfolio_id,
        statement_date=summary.get("statement_date"),
        source=src,
        total_value=float(summary.get("grand_total_current", 0)),
        cash_value=float(summary.get("cash_mv", 0)),
        positions_json=json.dumps(portfolio_data.get("positions", [])),
    )
    db.add(snapshot)
    db.flush()

    db_lots: list[Lot] = []
    for lot in lots_data:
        db_lot = Lot(
            snapshot_id=snapshot.id,
            ticker=lot["ticker"],
            name=lot.get("name", ""),
            section=lot.get("section", "STOCKS"),
            trade_date=lot.get("trade_date"),
            holding_period=lot.get("holding_period", "LT"),
            quantity=lot.get("quantity", 0),
            market_value=lot["market_value"],
            total_cost=lot.get("total_cost", 0),
            unrealized_gl=lot.get("unrealized_gl", 0),
            stress_beta=lot.get("stress_beta", stress_betas.get(lot["ticker"], 1.0)),
            raw_beta=lot.get("raw_beta"),
        )
        db.add(db_lot)
        db_lots.append(db_lot)

    db.commit()
    db.refresh(snapshot)
    for lot in db_lots:
        db.refresh(lot)

    return _snapshot_response(snapshot, db_lots)


def get_latest_holdings(db: Session, portfolio_id: int) -> HoldingsSnapshotResponse | None:
    _get_portfolio(db, portfolio_id)
    snapshot = db.scalar(
        select(HoldingsSnapshot)
        .where(HoldingsSnapshot.portfolio_id == portfolio_id)
        .order_by(desc(HoldingsSnapshot.created_at))
        .options(joinedload(HoldingsSnapshot.lots))
    )
    if not snapshot:
        return None
    return _snapshot_response(snapshot, snapshot.lots)


def _snapshot_response(snapshot: HoldingsSnapshot, lots: list[Lot]) -> HoldingsSnapshotResponse:
    return HoldingsSnapshotResponse(
        id=snapshot.id,
        portfolio_id=snapshot.portfolio_id,
        statement_date=snapshot.statement_date,
        source=snapshot.source,
        total_value=snapshot.total_value,
        cash_value=snapshot.cash_value,
        lot_count=len(lots),
        created_at=snapshot.created_at,
        lots=[LotResponse.model_validate(lot) for lot in lots],
    )


def list_client_portfolio_options(db: Session) -> list[DeRiskClientPortfolioOption]:
    clients = db.scalars(select(Client).order_by(Client.name)).all()
    options: list[DeRiskClientPortfolioOption] = []
    for client in clients:
        portfolios = db.scalars(
            select(Portfolio).where(Portfolio.client_id == client.id).order_by(Portfolio.name)
        ).all()
        for portfolio in portfolios:
            has_holdings = (
                db.scalar(
                    select(HoldingsSnapshot.id)
                    .where(HoldingsSnapshot.portfolio_id == portfolio.id)
                    .limit(1)
                )
                is not None
            )
            latest_run = db.scalar(
                select(DeriskAnalysisRun.id)
                .where(DeriskAnalysisRun.portfolio_id == portfolio.id)
                .order_by(desc(DeriskAnalysisRun.created_at))
                .limit(1)
            )
            options.append(
                DeRiskClientPortfolioOption(
                    client_id=client.id,
                    client_name=client.name,
                    portfolio_id=portfolio.id,
                    portfolio_name=portfolio.name,
                    has_holdings=has_holdings,
                    latest_run_id=latest_run,
                )
            )
    return options


def run_derisk_analysis(db: Session, portfolio_id: int) -> DeriskAnalysisRunResponse:
    snapshot = db.scalar(
        select(HoldingsSnapshot)
        .where(HoldingsSnapshot.portfolio_id == portfolio_id)
        .order_by(desc(HoldingsSnapshot.created_at))
        .options(joinedload(HoldingsSnapshot.lots))
    )
    if not snapshot or not snapshot.lots:
        raise HTTPException(status_code=400, detail="Upload holdings before running analysis")

    assumptions_row = get_or_create_assumptions(db, portfolio_id)
    config = assumptions_to_config(assumptions_row)

    lots_detail = [
        {
            "ticker": lot.ticker,
            "name": lot.name,
            "section": lot.section,
            "trade_date": lot.trade_date,
            "holding_period": lot.holding_period,
            "quantity": lot.quantity,
            "market_value": lot.market_value,
            "total_cost": lot.total_cost,
            "unrealized_gl": lot.unrealized_gl,
            "unrealized_gl_pct": round(lot.unrealized_gl / lot.total_cost * 100, 2)
            if lot.total_cost
            else None,
        }
        for lot in snapshot.lots
    ]
    stress_betas = {lot.ticker: lot.stress_beta for lot in snapshot.lots}
    summary = PortfolioSummary(total=snapshot.total_value, cash=snapshot.cash_value)

    result = run_analysis(lots_detail, stress_betas, summary, config)

    run = DeriskAnalysisRun(
        portfolio_id=portfolio_id,
        snapshot_id=snapshot.id,
        assumptions_id=assumptions_row.id,
        beta_before=result["beta_before"],
        tiers_json=json.dumps(result["tiers"]),
        sell_list_json=json.dumps(result["sell_list"]),
        decision_json=json.dumps(result["decision"]),
    )
    db.add(run)
    db.flush()

    lot_by_key = {
        (lot.ticker, lot.trade_date, lot.holding_period, round(lot.market_value, 2)): lot
        for lot in snapshot.lots
    }
    tier_rows_by_budget: dict[float, DeriskSellTier] = {}

    for tier_data in result["tiers"]["tiers"]:
        label = (
            f"beta_{tier_data.get('beta_target', tier_data['budget'])}"
            if config.tier_mode == "beta_target"
            else f"tax_{tier_data['budget']}"
        )
        prot = tier_data.get("drawdown_protection", {})
        budget_or_target = float(
            tier_data.get("beta_target", tier_data.get("budget", 0))
        )
        tier_row = DeriskSellTier(
            run_id=run.id,
            tier_label=label,
            budget_or_target=budget_or_target,
            n_lots=tier_data["n_lots"],
            proceeds=tier_data["proceeds"],
            gross_tax=tier_data["gross_tax"],
            net_tax=tier_data["net_tax_incl_harvest"],
            beta_after=tier_data["beta_after"],
            new_cash_pct=tier_data["new_cash_pct"],
            runway_after=tier_data["runway_years_after"],
            protect_dd20=prot.get("dd_20", 0),
            protect_dd30=prot.get("dd_30", 0),
            protect_dd40=prot.get("dd_40", 0),
            tier_json=json.dumps(tier_data),
        )
        db.add(tier_row)
        db.flush()
        tier_rows_by_budget[budget_or_target] = tier_row

    for sold in result["sell_list"]["sold_lots"]:
        key = (
            sold["ticker"],
            sold.get("trade_date"),
            sold.get("term"),
            round(sold["market_value"], 2),
        )
        db_lot = lot_by_key.get(key)
        tier_row = tier_rows_by_budget.get(float(sold["entry_tier"]))
        if tier_row:
            db.add(
                DeriskSellTierLot(
                    tier_id=tier_row.id,
                    lot_id=db_lot.id if db_lot else None,
                    entry_tier=sold["entry_tier"],
                    beta_dollars_removed=sold["beta_dollars_removed"],
                    tax_to_sell=sold["tax_to_sell"],
                    exposure_per_tax_dollar=sold.get("exposure_per_tax_dollar"),
                    lot_json=json.dumps(sold),
                )
            )

    db.commit()
    db.refresh(run)
    return DeriskAnalysisRunResponse.model_validate(run)


def _get_run(db: Session, run_id: int) -> DeriskAnalysisRun:
    run = db.get(DeriskAnalysisRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    return run


def get_tiers(db: Session, run_id: int) -> DeriskTiersResponse:
    run = _get_run(db, run_id)
    data = json.loads(run.tiers_json)
    assumptions = db.get(DeriskAssumptions, run.assumptions_id)
    tier_mode = assumptions.tier_mode if assumptions else "tax_budget"
    return DeriskTiersResponse(
        run_id=run.id,
        hold_all=data["hold_all"],
        tiers=data["tiers"],
        tier_mode=tier_mode,
    )


def get_sell_list(db: Session, run_id: int) -> DeriskSellListResponse:
    run = _get_run(db, run_id)
    data = json.loads(run.sell_list_json)
    assumptions = db.get(DeriskAssumptions, run.assumptions_id)
    tier_mode = assumptions.tier_mode if assumptions else "tax_budget"
    return DeriskSellListResponse(
        run_id=run.id,
        hold_all=data["hold_all"],
        tier_summary=data["tier_summary"],
        sold_lots=data["sold_lots"],
        incremental_positions=data["incremental_positions"],
        tier_mode=tier_mode,
    )


def get_lots(db: Session, run_id: int) -> DeriskLotsResponse:
    run = _get_run(db, run_id)
    data = json.loads(run.decision_json)
    return DeriskLotsResponse(
        run_id=run.id,
        lots=data["lots"],
        position_ranking=data["position_ranking"],
        portfolio=data["portfolio"],
    )


def get_latest_run(db: Session, portfolio_id: int) -> DeriskAnalysisRunResponse | None:
    run = db.scalar(
        select(DeriskAnalysisRun)
        .where(DeriskAnalysisRun.portfolio_id == portfolio_id)
        .order_by(desc(DeriskAnalysisRun.created_at))
    )
    if not run:
        return None
    return DeriskAnalysisRunResponse.model_validate(run)

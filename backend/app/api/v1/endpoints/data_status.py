from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.observability import get_refresh_run_summary
from app.models.db_models import DataRefreshLog
from app.models.schemas import DataStatusResponse, SeriesStatus
from app.services.data_fetchers.data_manager import refresh_all_data
from app.services.risk.return_assumptions import get_assumptions_metadata

router = APIRouter()


@router.get("", response_model=DataStatusResponse)
def get_data_status(db: Session = Depends(get_db)):
    """Return last refresh time and status for every data series."""
    logs = db.query(DataRefreshLog).order_by(DataRefreshLog.series_id).all()

    series_statuses = [
        SeriesStatus(
            series_id=log.series_id,
            source=log.source,
            last_refreshed=log.last_refreshed,
            status=log.status,
        )
        for log in logs
    ]

    error_count = sum(1 for s in series_statuses if s.status == "error")
    if not series_statuses:
        overall = "stale"
    elif error_count > len(series_statuses) // 2:
        overall = "error"
    elif error_count > 0:
        overall = "stale"
    else:
        overall = "ok"

    assumptions_meta = get_assumptions_metadata()

    return DataStatusResponse(
        series=series_statuses,
        overall_status=overall,
        as_of=datetime.now(UTC),
        last_refresh_run=get_refresh_run_summary(),
        assumptions_version=str(assumptions_meta["assumptions_version"]),
        assumptions_as_of=assumptions_meta["assumptions_as_of"],
    )


@router.post("/refresh")
async def trigger_refresh(background_tasks: BackgroundTasks):
    """Manually trigger a full data refresh (runs in background)."""
    background_tasks.add_task(refresh_all_data)
    return {"message": "Data refresh started in background"}

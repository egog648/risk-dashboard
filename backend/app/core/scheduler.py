import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def setup_scheduler():
    """Register all data refresh jobs."""
    from app.services.data_fetchers.data_manager import refresh_all_data

    cron_parts = settings.DATA_REFRESH_CRON.split()
    trigger = CronTrigger(
        minute=cron_parts[0],
        hour=cron_parts[1],
        day=cron_parts[2],
        month=cron_parts[3],
        day_of_week=cron_parts[4],
    )

    scheduler.add_job(
        refresh_all_data,
        trigger=trigger,
        id="daily_data_refresh",
        name="Daily macro data refresh",
        replace_existing=True,
    )
    logger.info("Scheduled daily data refresh: %s", settings.DATA_REFRESH_CRON)

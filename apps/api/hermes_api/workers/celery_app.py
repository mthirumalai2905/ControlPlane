from celery import Celery
from celery.schedules import crontab

from hermes_api.config import get_settings

settings = get_settings()

celery_app = Celery(
    "hermes",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["hermes_api.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "collect-metrics": {
            "task": "hermes_api.workers.tasks.collect_metrics",
            "schedule": 30.0,
        },
        "check-health": {
            "task": "hermes_api.workers.tasks.check_health",
            "schedule": 60.0,
        },
        "nightly-update-check": {
            "task": "hermes_api.workers.tasks.nightly_update_check",
            "schedule": crontab(hour=3, minute=0),
        },
        "prune-metrics": {
            "task": "hermes_api.workers.tasks.prune_metrics",
            "schedule": crontab(hour=4, minute=0),
        },
    },
)

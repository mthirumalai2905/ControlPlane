"""Background jobs (§10) — Phase 0 stubs; idempotent no-ops until Phase 2."""

from __future__ import annotations

import logging

from hermes_api.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="hermes_api.workers.tasks.install_server", bind=True, max_retries=3)
def install_server(self, workspace_id: str, registry_entry_id: str) -> dict:
    """Long-running install; Phase 0 runs sync in API — this is for Phase 1+ queueing."""
    logger.info("install_server queued workspace=%s entry=%s", workspace_id, registry_entry_id)
    return {"status": "queued_stub", "workspace_id": workspace_id}


@celery_app.task(name="hermes_api.workers.tasks.validate_server")
def validate_server(server_id: str) -> dict:
    logger.info("validate_server %s", server_id)
    return {"server_id": server_id, "status": "stub"}


@celery_app.task(name="hermes_api.workers.tasks.collect_metrics")
def collect_metrics() -> dict:
    logger.debug("collect_metrics tick")
    return {"collected": 0}


@celery_app.task(name="hermes_api.workers.tasks.check_health")
def check_health() -> dict:
    logger.debug("check_health tick")
    return {"checked": 0}


@celery_app.task(name="hermes_api.workers.tasks.nightly_update_check")
def nightly_update_check() -> dict:
    logger.info("nightly_update_check")
    return {"checked": 0}


@celery_app.task(name="hermes_api.workers.tasks.prune_metrics")
def prune_metrics() -> dict:
    logger.info("prune_metrics")
    return {"pruned": 0}

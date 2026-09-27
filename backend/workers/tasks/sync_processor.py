import logging
from datetime import datetime

from backend.workers.celery_app import celery_app

logger = logging.getLogger("busly.workers.sync_processor")


@celery_app.task(queue="sync", bind=True, max_retries=3)
def process_offline_batch(self, tenant_id: str, batch: list[dict]) -> dict:
    logger.info("processing_offline_batch", extra={"tenant_id": tenant_id, "batch_size": len(batch)})
    results = []
    for operation in batch:
        try:
            result = _process_operation(tenant_id, operation)
            results.append({"operation_id": operation.get("id"), "status": "success", "result": result})
        except Exception as exc:
            logger.error("operation_failed", extra={"operation": operation.get("id"), "error": str(exc)})
            results.append({"operation_id": operation.get("id"), "status": "failed", "error": str(exc)})
    return {"tenant_id": tenant_id, "processed": len(results), "results": results}


def _process_operation(tenant_id: str, operation: dict) -> dict:
    op_type = operation.get("type", "")
    entity = operation.get("entity", "")
    data = operation.get("data", {})
    timestamp = operation.get("timestamp", datetime.utcnow().isoformat())
    return {"type": op_type, "entity": entity, "applied_at": datetime.utcnow().isoformat()}

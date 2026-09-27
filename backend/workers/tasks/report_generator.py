import logging
from typing import Optional

from backend.workers.celery_app import celery_app

logger = logging.getLogger("busly.workers.report_generator")


@celery_app.task(queue="reports", bind=True, max_retries=3)
def generate_report(self, report_id: str, tenant_id: str, report_type: str) -> dict:
    logger.info("generating_report", extra={"report_id": report_id, "tenant_id": tenant_id, "type": report_type})
    try:
        data = _fetch_report_data(report_id, tenant_id, report_type)
        file_url = _generate_file(data, report_type, report_id)
        _update_report_status(report_id, tenant_id, "completed", file_url)
        _publish_notification(tenant_id, report_id, report_type)
        return {"report_id": report_id, "status": "completed", "url": file_url}
    except Exception as exc:
        logger.error("report_generation_failed", extra={"report_id": report_id, "error": str(exc)})
        _update_report_status(report_id, tenant_id, "failed")
        raise self.retry(exc=exc)


def _fetch_report_data(report_id: str, tenant_id: str, report_type: str) -> list[dict]:
    return []


def _generate_file(data: list[dict], report_type: str, report_id: str) -> str:
    return f"https://storage.busly.app/reports/{report_id}.{report_type}"


def _update_report_status(report_id: str, tenant_id: str, status: str, url: Optional[str] = None) -> None:
    pass


def _publish_notification(tenant_id: str, report_id: str, report_type: str) -> None:
    pass

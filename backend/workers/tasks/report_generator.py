import asyncio
import csv
import json
import logging
import os
from pathlib import Path
from typing import Optional

import asyncpg

from backend.workers.celery_app import celery_app

logger = logging.getLogger("busly.workers.report_generator")

REPORT_DIR = os.environ.get("REPORT_DIR", "/var/busly/reports")

REPORT_QUERIES = {
    "ridership": "SELECT student_id, vehicle_id, action, timestamp FROM ridership_logs WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 1000",
    "attendance": "SELECT student_id, date, trip_type, status FROM attendance WHERE tenant_id = $1 ORDER BY date DESC LIMIT 1000",
    "students": "SELECT student_id, first_name, last_name, class_name, section, status FROM students WHERE tenant_id = $1",
    "vehicles": "SELECT plate_number, vehicle_type, status, seating_capacity FROM vehicles WHERE tenant_id = $1",
    "trips": "SELECT route_id, trip_type, status, scheduled_start_time FROM trips WHERE tenant_id = $1 ORDER BY scheduled_start_time DESC LIMIT 1000",
}


@celery_app.task(queue="reports", bind=True, max_retries=3)
def generate_report(self, report_id: str, tenant_id: str, report_type: str) -> dict:
    logger.info("generating_report", extra={"report_id": report_id, "tenant_id": tenant_id, "type": report_type})
    try:
        data = asyncio.run(_fetch_report_data(tenant_id, report_type))
        file_url = asyncio.run(_write_report_file(report_id, report_type, data))
        asyncio.run(_update_report_status(report_id, tenant_id, "completed", file_url))
        asyncio.run(_publish_notification(tenant_id, report_id, report_type))
        return {"report_id": report_id, "status": "completed", "url": file_url, "rows": len(data)}
    except Exception as exc:
        logger.error("report_generation_failed", extra={"report_id": report_id, "error": str(exc)})
        try:
            asyncio.run(_update_report_status(report_id, tenant_id, "failed"))
        except Exception:
            pass
        raise self.retry(exc=exc)


async def _connect(tenant_id: str):
    from backend.services.tenant.db import _sync_url
    return await asyncpg.connect(await _sync_url(f"tenant_{tenant_id}"))


async def _fetch_report_data(tenant_id: str, report_type: str) -> list[dict]:
    query = REPORT_QUERIES.get(report_type)
    if not query:
        return []
    conn = await _connect(tenant_id)
    try:
        rows = await conn.fetch(query, tenant_id)
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def _write_report_file(report_id: str, report_type: str, data: list[dict]) -> str:
    Path(REPORT_DIR).mkdir(parents=True, exist_ok=True)
    path = Path(REPORT_DIR) / f"{report_id}.csv"
    with open(path, "w", newline="") as f:
        if not data:
            f.write("(no rows)")
        else:
            writer = csv.writer(f)
            writer.writerow(list(data[0].keys()))
            for row in data:
                writer.writerow([str(v) if v is not None else "" for v in row.values()])
    return f"/api/v1/reports/{report_id}/file"


async def _update_report_status(report_id: str, tenant_id: str, status: str, url: Optional[str] = None) -> None:
    conn = await _connect(tenant_id)
    try:
        await conn.execute(
            "UPDATE reports SET status = $2::text, file_url = COALESCE($3::text, file_url), "
            "completed_at = CASE WHEN $2::text IN ('completed', 'failed') THEN NOW() ELSE completed_at END "
            "WHERE id = $1::uuid",
            report_id, status, url,
        )
    finally:
        await conn.close()


async def _publish_notification(tenant_id: str, report_id: str, report_type: str) -> None:
    conn = await _connect(tenant_id)
    try:
        await conn.execute(
            "INSERT INTO notifications (tenant_id, user_id, title, body, channel, notification_type, status, sent_at) VALUES ($1, NULL, $2, $3, 'in_app', 'report', 'sent', NOW())",
            tenant_id, f"Report ready: {report_type}", json.dumps({"report_id": report_id}),
        )
    finally:
        await conn.close()

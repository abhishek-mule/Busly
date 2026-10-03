import asyncio
import math
import logging
from typing import Optional

import asyncpg

from backend.workers.celery_app import celery_app

logger = logging.getLogger("busly.workers.route_optimizer")


@celery_app.task(queue="optimization", bind=True, max_retries=3)
def optimize_route(self, route_id: str, tenant_id: str) -> dict:
    logger.info("optimizing_route", extra={"route_id": route_id, "tenant_id": tenant_id})
    try:
        stops = _load_stops(route_id, tenant_id)
        if not stops:
            return {"route_id": route_id, "status": "no_stops", "optimized_order": []}
        optimized = _nearest_neighbor_tsp(stops)
        _update_route_order(route_id, tenant_id, optimized)
        _publish_optimized_event(route_id, tenant_id, optimized)
        return {"route_id": route_id, "status": "completed", "optimized_order": [s["id"] for s in optimized]}
    except Exception as exc:
        logger.error("optimization_failed", extra={"route_id": route_id, "error": str(exc)})
        raise self.retry(exc=exc)


async def _connect(tenant_id: str):
    from backend.services.tenant.db import _sync_url
    return await asyncpg.connect(await _sync_url(f"tenant_{tenant_id}"))


def _load_stops(route_id: str, tenant_id: str) -> list[dict]:
    return asyncio.run(_fetch_stops(route_id, tenant_id))


async def _fetch_stops(route_id: str, tenant_id: str) -> list[dict]:
    conn = await _connect(tenant_id)
    try:
        rows = await conn.fetch(
            "SELECT id::text AS id, name, latitude, longitude, stop_order FROM stops"
            " WHERE route_id = $1::uuid AND tenant_id = $2 AND is_active = true"
            " ORDER BY stop_order ASC",
            route_id, tenant_id,
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearest_neighbor_tsp(stops: list[dict]) -> list[dict]:
    if len(stops) <= 2:
        return stops
    unvisited = list(stops)
    tour = [unvisited.pop(0)]
    while unvisited:
        last = tour[-1]
        nearest_idx = min(
            range(len(unvisited)),
            key=lambda i: _haversine(
                last["latitude"], last["longitude"],
                unvisited[i]["latitude"], unvisited[i]["longitude"],
            ),
        )
        tour.append(unvisited.pop(nearest_idx))
    return tour


def _update_route_order(route_id: str, tenant_id: str, stops: list[dict]) -> None:
    asyncio.run(_persist_order(route_id, tenant_id, stops))


async def _persist_order(route_id: str, tenant_id: str, stops: list[dict]) -> None:
    conn = await _connect(tenant_id)
    try:
        for position, stop in enumerate(stops, start=1):
            await conn.execute(
                "UPDATE stops SET stop_order = $1, updated_at = NOW()"
                " WHERE id = $2::uuid AND tenant_id = $3",
                position, stop["id"], tenant_id,
            )
    finally:
        await conn.close()


def _publish_optimized_event(route_id: str, tenant_id: str, stops: list[dict]) -> None:
    try:
        asyncio.run(_insert_alert(route_id, tenant_id, len(stops)))
    except Exception as exc:
        logger.warning("optimize_alert_failed", extra={"route_id": route_id, "error": str(exc)})


async def _insert_alert(route_id: str, tenant_id: str, count: int) -> None:
    conn = await _connect(tenant_id)
    try:
        route = await conn.fetchrow("SELECT name FROM routes WHERE id = $1::uuid AND tenant_id = $2", route_id, tenant_id)
        name = (route["name"] if route else route_id[:8]) or "Route"
        title = name if name.lower().startswith("route") else f"Route {name}"
        await conn.execute(
            "INSERT INTO alerts (tenant_id, alert_type, title, message, route_id, severity)"
            " VALUES ($1, 'route_optimized', $2, $3, $4::uuid, 'info')",
            tenant_id, f"{title} optimized",
            f"Stop order recalculated for {count} stops using shortest-path ordering.",
            route_id,
        )
    finally:
        await conn.close()

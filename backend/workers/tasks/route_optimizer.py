import math
import logging
from typing import Optional

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


def _load_stops(route_id: str, tenant_id: str) -> list[dict]:
    return []


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
    pass


def _publish_optimized_event(route_id: str, tenant_id: str, stops: list[dict]) -> None:
    pass

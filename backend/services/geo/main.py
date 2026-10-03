import os
from contextlib import asynccontextmanager
from sqlalchemy import text
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app
from redis.asyncio import Redis
from datetime import datetime
import json
import math

from backend.libs.shared.database import TenantRegistry, TenantSessionFactory, TenantEnginePool

redis: Redis = None
tenant_registry: TenantRegistry = None
session_factory: TenantSessionFactory = None
engine_pool: TenantEnginePool = None

active_connections: dict[str, list[WebSocket]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis, tenant_registry, session_factory, engine_pool
    redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
    tenant_registry = TenantRegistry(redis)
    engine_pool = TenantEnginePool()
    session_factory = TenantSessionFactory(tenant_registry, engine_pool)
    yield
    await redis.close()


app = FastAPI(title="Busly Geo Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class PositionUpdate(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    speed: float = 0.0
    heading: float = 0.0
    accuracy: float = 0.0
    timestamp: str = ""


class GeofenceZoneCreate(BaseModel):
    name: str
    zone_type: str
    coordinates: list
    radius_meters: float = 0.0


class GeofenceCheck(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float


@app.get("/health")
async def health():
    return {"status": "ok", "service": "geo-service", "version": "1.0.0"}


@app.post("/geo/position")
async def push_position(data: PositionUpdate, tenant_id: str = "default"):
    ts = data.timestamp or datetime.utcnow().isoformat()
    payload = {
        "vehicle_id": data.vehicle_id,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "speed": data.speed,
        "heading": data.heading,
        "accuracy": data.accuracy,
        "timestamp": ts,
    }
    await redis.setex(f"pos:{data.vehicle_id}", 30, json.dumps(payload))

    session = session_factory.get_session(tenant_id)
    async for s in session:
        db_ts = datetime.fromisoformat(ts)
        await s.execute(text("""INSERT INTO gps_locations (tenant_id, vehicle_id, latitude, longitude, speed, heading, accuracy, recorded_at)
               VALUES (:tid, NULLIF(:vid, '')::uuid, :lat, :lon, :speed, :heading, :acc, :ts)"""),
            {"tid": tenant_id, "vid": data.vehicle_id, "lat": data.latitude, "lon": data.longitude,
             "speed": data.speed, "heading": data.heading, "acc": data.accuracy, "ts": db_ts}
        )
        await s.commit()

    ws_list = active_connections.get(data.vehicle_id, [])
    dead = []
    for ws in ws_list:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_list.remove(ws)
    try:
        await _process_geofence_transitions(data.vehicle_id, data.latitude, data.longitude, tenant_id)
    except Exception:
        pass
    return {"status": "ok"}


async def _process_geofence_transitions(vehicle_id: str, latitude: float, longitude: float, tenant_id: str) -> None:
    """Persist enter/exit alerts on zone transitions. State-based: no repeat alerts while inside."""
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM geofence_zones WHERE tenant_id = :tid AND is_active = true"),
            {"tid": tenant_id}
        )
        zones = [dict(z._mapping) for z in result.fetchall()]
        if not zones:
            return
        current = set()
        by_id = {}
        for z in zones:
            zid = str(z["id"])
            by_id[zid] = z
            coords = json.loads(z["coordinates"]) if isinstance(z["coordinates"], str) else z["coordinates"]
            if _point_in_polygon(latitude, longitude, coords, z.get("radius_meters") or 100):
                current.add(zid)
        raw = await redis.get(f"geostate:{vehicle_id}")
        previous = set(json.loads(raw)) if raw else set()
        entered = current - previous
        exited = previous - current
        for zid in entered:
            z = by_id[zid]
            await s.execute(text("""INSERT INTO alerts (tenant_id, alert_type, title, message, vehicle_id, severity)
                   VALUES (:tid, 'geofence', :title, :msg, NULLIF(:vid, '')::uuid, 'info')"""),
                {"tid": tenant_id, "title": f"Entered {z['name']}",
                 "msg": f"Vehicle arrived at {z['name']} zone.", "vid": vehicle_id}
            )
        for zid in exited:
            z = by_id.get(zid)
            if not z:
                continue
            await s.execute(text("""INSERT INTO alerts (tenant_id, alert_type, title, message, vehicle_id, severity)
                   VALUES (:tid, 'geofence', :title, :msg, NULLIF(:vid, '')::uuid, 'info')"""),
                {"tid": tenant_id, "title": f"Exited {z['name']}",
                 "msg": f"Vehicle left {z['name']} zone.", "vid": vehicle_id}
            )
        if entered or exited:
            await s.commit()
        await redis.setex(f"geostate:{vehicle_id}", 21600, json.dumps(sorted(current)))


@app.get("/geo/vehicle/{vehicle_id}/live")
async def live_position(vehicle_id: str):
    data = await redis.get(f"pos:{vehicle_id}")
    if not data:
        raise HTTPException(status_code=404, detail={"code": "NO_POSITION", "message": "No position data available"})
    return json.loads(data)


@app.websocket("/ws")
async def websocket_ping(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "pong", "data": data}))
    except WebSocketDisconnect:
        pass


@app.websocket("/geo/vehicle/{vehicle_id}/stream")
async def position_stream(websocket: WebSocket, vehicle_id: str):
    await websocket.accept()
    if vehicle_id not in active_connections:
        active_connections[vehicle_id] = []
    active_connections[vehicle_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await redis.setex(f"pos:{vehicle_id}", 30, data)
            ws_list = active_connections.get(vehicle_id, [])
            for ws in ws_list:
                if ws != websocket:
                    try:
                        await ws.send_text(data)
                    except Exception:
                        pass
    except WebSocketDisconnect:
        if vehicle_id in active_connections:
            active_connections[vehicle_id].remove(websocket)


@app.post("/geo/geofence/zones")
async def create_geofence(data: GeofenceZoneCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO geofence_zones (tenant_id, name, zone_type, coordinates, radius_meters)
               VALUES (:tid, :name, :zt, :coords, :rm) RETURNING id"""),
            {"tid": tenant_id, "name": data.name, "zt": data.zone_type,
             "coords": json.dumps(data.coordinates), "rm": data.radius_meters}
        )
        zone_id = str(result.scalar())
        await s.commit()
        return {"id": zone_id, "status": "created", "name": data.name, "zone_type": data.zone_type}


@app.get("/geo/geofence/zones")
async def list_geofences(tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM geofence_zones WHERE tenant_id = :tid AND is_active = true"),
            {"tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows]}


@app.post("/geo/geofence/check")
async def check_geofence(data: GeofenceCheck, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM geofence_zones WHERE tenant_id = :tid AND is_active = true"),
            {"tid": tenant_id}
        )
        zones = result.fetchall()
        in_zones = []
        alerts = []
        for zone in zones:
            z = dict(zone._mapping)
            coords = json.loads(z["coordinates"]) if isinstance(z["coordinates"], str) else z["coordinates"]
            if _point_in_polygon(data.latitude, data.longitude, coords, z.get("radius_meters") or 100):
                in_zones.append(z["id"])
                alerts.append({"zone_id": z["id"], "zone_name": z["name"], "type": "geofence_enter"})
        return {"vehicle_id": data.vehicle_id, "in_zones": in_zones, "alerts": alerts}


@app.get("/geo/proximity-alerts")
async def proximity_alerts(tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM alerts WHERE tenant_id = :tid AND alert_type = 'proximity' AND is_resolved = false ORDER BY created_at DESC LIMIT 20"),
            {"tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows]}


@app.post("/gps/location")
async def gps_location(data: PositionUpdate, tenant_id: str = "default"):
    return await push_position(data, tenant_id)


@app.get("/gps/active")
async def gps_active(tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""SELECT DISTINCT ON (vehicle_id) vehicle_id, latitude, longitude, speed, heading, recorded_at
               FROM gps_locations WHERE tenant_id = :tid ORDER BY vehicle_id, recorded_at DESC"""),
            {"tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows]}


@app.get("/gps/vehicle/{vehicle_id}")
async def gps_vehicle(vehicle_id: str, tenant_id: str = "default"):
    data = await redis.get(f"pos:{vehicle_id}")
    if data:
        return json.loads(data)
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM gps_locations WHERE vehicle_id = :vid AND tenant_id = :tid ORDER BY recorded_at DESC LIMIT 1"),
            {"vid": vehicle_id, "tid": tenant_id}
        )
        row = result.fetchone()
        if row:
            return dict(row._mapping)
    raise HTTPException(status_code=404, detail={"code": "NO_POSITION", "message": "No GPS data"})


@app.get("/gps/vehicle/{vehicle_id}/history")
async def gps_vehicle_history(vehicle_id: str, tenant_id: str = "default", hours: int = 24):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""SELECT * FROM gps_locations WHERE vehicle_id = :vid AND tenant_id = :tid
               AND recorded_at >= NOW() - make_interval(hours => :hours) ORDER BY recorded_at ASC"""),
            {"vid": vehicle_id, "tid": tenant_id, "hours": hours}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "vehicle_id": vehicle_id}


def _point_in_polygon(lat: float, lon: float, polygon: list, radius_meters: float = 100) -> bool:
    if not polygon:
        return False
    if len(polygon) == 2 and isinstance(polygon[0], (int, float)):
        return _haversine(lat, lon, polygon[0], polygon[1]) <= (radius_meters or 100)
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

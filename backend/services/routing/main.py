import os
from contextlib import asynccontextmanager
from sqlalchemy import text
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app
from redis.asyncio import Redis
from datetime import datetime

from backend.libs.shared.database import TenantRegistry, TenantSessionFactory, TenantEnginePool, nullable

redis: Redis = None
tenant_registry: TenantRegistry = None
session_factory: TenantSessionFactory = None
engine_pool: TenantEnginePool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis, tenant_registry, session_factory, engine_pool
    redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
    tenant_registry = TenantRegistry(redis)
    engine_pool = TenantEnginePool()
    session_factory = TenantSessionFactory(tenant_registry, engine_pool)
    yield
    await redis.close()


app = FastAPI(title="Busly Routing Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class RouteCreate(BaseModel):
    name: str
    route_code: str = ""
    description: str = ""
    start_point: str = ""
    end_point: str = ""
    direction: str = "pickup"
    morning_pickup_time: str = ""
    evening_drop_time: str = ""
    vehicle_id: str = ""
    driver_id: str = ""
    base_fare: float = 0


class RouteUpdate(BaseModel):
    name: str = ""
    route_code: str = ""
    description: str = ""
    start_point: str = ""
    end_point: str = ""
    direction: str = ""
    status: str = ""
    vehicle_id: str = ""
    driver_id: str = ""


class StopCreate(BaseModel):
    route_id: str
    name: str
    address: str = ""
    landmark: str = ""
    latitude: float
    longitude: float
    stop_order: int
    estimated_arrival_time: str = ""


class StopUpdate(BaseModel):
    name: str = ""
    address: str = ""
    landmark: str = ""
    latitude: float = 0
    longitude: float = 0
    stop_order: int = 0
    estimated_arrival_time: str = ""
    is_active: bool = True


class TripCreate(BaseModel):
    route_id: str
    vehicle_id: str = ""
    driver_id: str = ""
    trip_type: str = "pickup"
    scheduled_start_time: str = ""
    scheduled_end_time: str = ""
    notes: str = ""


class TripStopEvent(BaseModel):
    trip_id: str
    stop_id: str
    vehicle_id: str
    student_count: int = 0


@app.get("/health")
async def health():
    return {"status": "ok", "service": "routing-service", "version": "1.0.0"}


@app.post("/routes")
async def create_route(data: RouteCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO routes (tenant_id, name, route_code, description, start_point, end_point, direction,
               morning_pickup_time, evening_drop_time, vehicle_id, driver_id, base_fare)
               VALUES (:tid, :name, :rc, :desc, :sp, :ep, :dir, NULLIF(:mpt, '')::time, NULLIF(:edt, '')::time, NULLIF(:vid, '')::uuid, NULLIF(:did, '')::uuid, :bf) RETURNING id"""),
            {"tid": tenant_id, "name": data.name, "rc": data.route_code, "desc": data.description,
             "sp": data.start_point, "ep": data.end_point, "dir": data.direction,
             "mpt": nullable(data.morning_pickup_time), "edt": nullable(data.evening_drop_time),
             "vid": nullable(data.vehicle_id), "did": nullable(data.driver_id), "bf": data.base_fare}
        )
        route_id = str(result.scalar())
        await s.commit()
        return {"id": route_id, "status": "created"}


@app.get("/routes")
async def list_routes(tenant_id: str = "default", status: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if status:
            where += " AND status = :status"
            params["status"] = status
        total = await s.execute(text(f"SELECT COUNT(*) FROM routes {where}"), params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM routes {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        routes = [dict(r._mapping) for r in rows]
        return {"items": routes, "total": total_count, "page": page, "page_size": limit}


@app.get("/routes/{route_id}")
async def get_route(route_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM routes WHERE id = :id AND tenant_id = :tid"), {"id": route_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Route not found"})
        return dict(row._mapping)


@app.put("/routes/{route_id}")
async def update_route(route_id: str, data: RouteUpdate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        fields = []
        params = {"id": route_id, "tid": tenant_id}
        casts = {"vehicle_id": "uuid", "driver_id": "uuid"}
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None and value != "":
                fields.append(f"{key} = " + (f"NULLIF(:{key}, '')::{casts[key]}" if key in casts else f":{key}"))
                params[key] = value
        if fields:
            await s.execute(text(f"UPDATE routes SET {', '.join(fields)} WHERE id = :id AND tenant_id = :tid"), params)
            await s.commit()
        result = await s.execute(text("SELECT * FROM routes WHERE id = :id AND tenant_id = :tid"), {"id": route_id, "tid": tenant_id})
        row = result.fetchone()
        return dict(row._mapping)


@app.delete("/routes/{route_id}")
async def delete_route(route_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE routes SET status = 'inactive' WHERE id = :id AND tenant_id = :tid"), {"id": route_id, "tid": tenant_id})
        await s.commit()
        return {"status": "deleted"}


@app.post("/routes/{route_id}/optimize")
async def optimize_route(route_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT id FROM routes WHERE id = :id AND tenant_id = :tid"), {"id": route_id, "tid": tenant_id})
        if not result.scalar():
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Route not found"})
    try:
        from backend.workers.celery_app import celery_app
        task = celery_app.send_task(
            "backend.workers.tasks.route_optimizer.optimize_route",
            args=[route_id, tenant_id],
            queue="optimization",
        )
        return {"task_id": task.id, "status": "queued", "route_id": route_id}
    except Exception:
        raise HTTPException(status_code=503, detail={"code": "QUEUE_UNAVAILABLE", "message": "Optimization worker is unavailable"})


@app.get("/routes/{route_id}/optimize/{task_id}/status")
async def optimize_status(route_id: str, task_id: str):
    try:
        from backend.workers.celery_app import celery_app
        res = celery_app.AsyncResult(task_id)
        state = res.state
        if state == "SUCCESS":
            return {"task_id": task_id, "route_id": route_id, "status": "completed", "result": res.result}
        if state == "FAILURE":
            return {"task_id": task_id, "route_id": route_id, "status": "failed"}
        return {"task_id": task_id, "route_id": route_id, "status": "in_progress" if state == "STARTED" else "queued"}
    except Exception:
        raise HTTPException(status_code=503, detail={"code": "QUEUE_UNAVAILABLE", "message": "Optimization worker is unavailable"})


@app.get("/routes/{route_id}/stops")
async def route_stops(route_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM stops WHERE route_id = :rid AND tenant_id = :tid AND is_active = true ORDER BY stop_order ASC"),
            {"rid": route_id, "tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "route_id": route_id}


@app.post("/stops")
async def create_stop(data: StopCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO stops (tenant_id, route_id, name, address, landmark, latitude, longitude, stop_order, estimated_arrival_time)
               VALUES (:tid, NULLIF(:rid, '')::uuid, :name, :addr, :lm, :lat, :lon, :so, NULLIF(:eat, '')::time) RETURNING id"""),
            {"tid": tenant_id, "rid": nullable(data.route_id), "name": data.name, "addr": data.address,
             "lm": data.landmark, "lat": data.latitude, "lon": data.longitude,
             "so": data.stop_order, "eat": nullable(data.estimated_arrival_time)}
        )
        stop_id = str(result.scalar())
        await s.commit()
        return {"id": stop_id, "status": "created"}


@app.get("/stops")
async def list_stops(tenant_id: str = "default", route_id: str = "", page: int = 1, limit: int = 50):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if route_id:
            where += " AND route_id = :rid"
            params["rid"] = route_id
        total = (await s.execute(text(f"SELECT COUNT(*) FROM stops {where}"), params)).scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM stops {where} ORDER BY stop_order ASC, created_at DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "total": total, "page": page, "page_size": limit}


@app.get("/stops/{stop_id}")
async def get_stop(stop_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM stops WHERE id = :id AND tenant_id = :tid"), {"id": stop_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Stop not found"})
        return dict(row._mapping)


@app.put("/stops/{stop_id}")
async def update_stop(stop_id: str, data: StopUpdate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        fields = []
        params = {"id": stop_id, "tid": tenant_id}
        casts = {"estimated_arrival_time": "time"}
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None and value != "":
                fields.append(f"{key} = " + (f"NULLIF(:{key}, '')::{casts[key]}" if key in casts else f":{key}"))
                params[key] = value
        if fields:
            await s.execute(text(f"UPDATE stops SET {', '.join(fields)} WHERE id = :id AND tenant_id = :tid"), params)
            await s.commit()
        result = await s.execute(text("SELECT * FROM stops WHERE id = :id AND tenant_id = :tid"), {"id": stop_id, "tid": tenant_id})
        row = result.fetchone()
        return dict(row._mapping)


@app.delete("/stops/{stop_id}")
async def delete_stop(stop_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE stops SET is_active = false WHERE id = :id AND tenant_id = :tid"), {"id": stop_id, "tid": tenant_id})
        await s.commit()
        return {"status": "deleted"}


@app.post("/trip-stops/arrive")
async def trip_stop_arrive(data: TripStopEvent, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("""INSERT INTO trip_stop_logs (tenant_id, trip_id, stop_id, vehicle_id, actual_arrival, student_count)
               VALUES (:tid, :trip_id, :stop_id, :vid, NOW(), :sc)"""),
            {"tid": tenant_id, "trip_id": data.trip_id, "stop_id": data.stop_id, "vid": data.vehicle_id, "sc": data.student_count}
        )
        await s.commit()
        return {"status": "arrived", "trip_id": data.trip_id, "stop_id": data.stop_id}


@app.post("/trip-stops/depart")
async def trip_stop_depart(data: TripStopEvent, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE trip_stop_logs SET actual_departure = NOW() WHERE trip_id = :trip_id AND stop_id = :stop_id AND tenant_id = :tid"),
            {"trip_id": data.trip_id, "stop_id": data.stop_id, "tid": tenant_id}
        )
        await s.commit()
        return {"status": "departed", "trip_id": data.trip_id, "stop_id": data.stop_id}


@app.get("/trips")
async def list_trips(tenant_id: str = "default", status: str = "", date: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if status:
            where += " AND status = :status"
            params["status"] = status
        if date:
            where += " AND DATE(scheduled_start_time) = NULLIF(:date, '')::date"
            params["date"] = date
        total = await s.execute(text(f"SELECT COUNT(*) FROM trips {where}"), params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM trips {where} ORDER BY scheduled_start_time DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        trips = [dict(r._mapping) for r in rows]
        return {"items": trips, "total": total_count, "page": page, "page_size": limit}


@app.post("/trips")
async def create_trip(data: TripCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO trips (tenant_id, route_id, vehicle_id, driver_id, trip_type, scheduled_start_time, scheduled_end_time, notes)
               VALUES (:tid, NULLIF(:rid, '')::uuid, NULLIF(:vid, '')::uuid, NULLIF(:did, '')::uuid, :tt, NULLIF(:sst, '')::timestamptz, NULLIF(:set, '')::timestamptz, :notes) RETURNING id"""),
            {"tid": tenant_id, "rid": nullable(data.route_id), "vid": nullable(data.vehicle_id), "did": nullable(data.driver_id),
             "tt": data.trip_type, "sst": nullable(data.scheduled_start_time), "set": nullable(data.scheduled_end_time), "notes": data.notes}
        )
        trip_id = str(result.scalar())
        await s.commit()
        return {"id": trip_id, "status": "scheduled"}


@app.get("/trips/{trip_id}")
async def get_trip(trip_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM trips WHERE id = :id AND tenant_id = :tid"), {"id": trip_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Trip not found"})
        return dict(row._mapping)


@app.post("/trips/{trip_id}/start")
async def start_trip(trip_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE trips SET status = 'in_progress', actual_start_time = NOW() WHERE id = :id AND tenant_id = :tid"),
            {"id": trip_id, "tid": tenant_id}
        )
        await s.commit()
        return {"id": trip_id, "status": "in_progress"}


@app.post("/trips/{trip_id}/complete")
async def complete_trip(trip_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE trips SET status = 'completed', actual_end_time = NOW() WHERE id = :id AND tenant_id = :tid"),
            {"id": trip_id, "tid": tenant_id}
        )
        await s.commit()
        return {"id": trip_id, "status": "completed"}

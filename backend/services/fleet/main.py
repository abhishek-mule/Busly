import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app
from redis.asyncio import Redis
from sqlalchemy import text

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


app = FastAPI(title="Busly Fleet Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class VehicleCreate(BaseModel):
    plate_number: str
    vehicle_type: str = "bus"
    make: str = ""
    model: str = ""
    year: int = 0
    color: str = ""
    seating_capacity: int
    insurance_number: str = ""
    insurance_expiry: str = ""
    permit_number: str = ""
    permit_expiry: str = ""
    gps_device_id: str = ""


class VehicleUpdate(BaseModel):
    plate_number: str = ""
    vehicle_type: str = ""
    make: str = ""
    model: str = ""
    year: int = 0
    color: str = ""
    seating_capacity: int = 0
    status: str = ""
    is_available: bool = True


class DriverCreate(BaseModel):
    user_id: str = ""
    license_number: str
    license_type: str = ""
    license_expiry: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""


class DriverUpdate(BaseModel):
    license_number: str = ""
    license_type: str = ""
    license_expiry: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    status: str = ""


class MaintenanceCreate(BaseModel):
    vehicle_id: str
    maintenance_type: str
    scheduled_date: str
    title: str = ""
    description: str = ""


@app.get("/health")
async def health():
    return {"status": "ok", "service": "fleet-service", "version": "1.0.0"}


@app.post("/vehicles")
async def create_vehicle(data: VehicleCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO vehicles (tenant_id, plate_number, vehicle_type, make, model, year, color, seating_capacity,
               insurance_number, insurance_expiry, permit_number, permit_expiry, gps_device_id)
               VALUES (:tid, :pn, :vt, :mk, :md, :yr, :cl, :sc, :in, NULLIF(:ie, '')::date, :prn, NULLIF(:pe, '')::date, :gps) RETURNING id"""),
            {"tid": tenant_id, "pn": data.plate_number, "vt": data.vehicle_type, "mk": data.make, "md": data.model,
             "yr": data.year, "cl": data.color, "sc": data.seating_capacity, "in": data.insurance_number,
             "ie": nullable(data.insurance_expiry), "prn": data.permit_number, "pe": nullable(data.permit_expiry), "gps": data.gps_device_id}
        )
        vehicle_id = str(result.scalar())
        await s.commit()
        return {"id": vehicle_id, "status": "created"}


@app.get("/vehicles")
async def list_vehicles(tenant_id: str = "default", status: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if status:
            where += " AND status = :status"
            params["status"] = status
        total = await s.execute(text(f"SELECT COUNT(*) FROM vehicles {where}"), params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM vehicles {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        vehicles = [dict(r._mapping) for r in rows]
        return {"items": vehicles, "total": total_count, "page": page, "page_size": limit}


@app.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM vehicles WHERE id = :id AND tenant_id = :tid"), {"id": vehicle_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Vehicle not found"})
        return dict(row._mapping)


@app.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleUpdate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        fields = []
        params = {"id": vehicle_id, "tid": tenant_id}
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None and value != "":
                fields.append(f"{key} = :{key}")
                params[key] = value
        if fields:
            await s.execute(text(f"UPDATE vehicles SET {', '.join(fields)} WHERE id = :id AND tenant_id = :tid"), params)
            await s.commit()
        result = await s.execute(text("SELECT * FROM vehicles WHERE id = :id AND tenant_id = :tid"), {"id": vehicle_id, "tid": tenant_id})
        row = result.fetchone()
        return dict(row._mapping)


@app.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE vehicles SET status = 'inactive' WHERE id = :id AND tenant_id = :tid"), {"id": vehicle_id, "tid": tenant_id})
        await s.commit()
        return {"status": "deleted"}


@app.get("/vehicles/{vehicle_id}/maintenance-history")
async def vehicle_maintenance_history(vehicle_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM maintenance_schedules WHERE vehicle_id = :vid AND tenant_id = :tid ORDER BY scheduled_date DESC"),
            {"vid": vehicle_id, "tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "vehicle_id": vehicle_id}


@app.post("/drivers")
async def create_driver(data: DriverCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO drivers (tenant_id, user_id, license_number, license_type, license_expiry, phone, address, city)
               VALUES (:tid, NULLIF(:uid, '')::uuid, :ln, :lt, NULLIF(:le, '')::date, :ph, :addr, :city) RETURNING id"""),
            {"tid": tenant_id, "uid": nullable(data.user_id), "ln": data.license_number, "lt": data.license_type,
             "le": nullable(data.license_expiry), "ph": data.phone, "addr": data.address, "city": data.city}
        )
        driver_id = str(result.scalar())
        await s.commit()
        return {"id": driver_id, "status": "created"}


@app.get("/drivers")
async def list_drivers(tenant_id: str = "default", status: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if status:
            where += " AND status = :status"
            params["status"] = status
        total = await s.execute(text(f"SELECT COUNT(*) FROM drivers {where}"), params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM drivers {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        drivers = [dict(r._mapping) for r in rows]
        return {"items": drivers, "total": total_count, "page": page, "page_size": limit}


@app.get("/drivers/{driver_id}")
async def get_driver(driver_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM drivers WHERE id = :id AND tenant_id = :tid"), {"id": driver_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Driver not found"})
        return dict(row._mapping)


@app.put("/drivers/{driver_id}")
async def update_driver(driver_id: str, data: DriverUpdate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        fields = []
        params = {"id": driver_id, "tid": tenant_id}
        casts = {"license_expiry": "date"}
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None and value != "":
                fields.append(f"{key} = " + (f"NULLIF(:{key}, '')::{casts[key]}" if key in casts else f":{key}"))
                params[key] = value
        if fields:
            await s.execute(text(f"UPDATE drivers SET {', '.join(fields)} WHERE id = :id AND tenant_id = :tid"), params)
            await s.commit()
        result = await s.execute(text("SELECT * FROM drivers WHERE id = :id AND tenant_id = :tid"), {"id": driver_id, "tid": tenant_id})
        row = result.fetchone()
        return dict(row._mapping)


@app.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE drivers SET status = 'inactive' WHERE id = :id AND tenant_id = :tid"), {"id": driver_id, "tid": tenant_id})
        await s.commit()
        return {"status": "deleted"}


@app.get("/drivers/{driver_id}/routes")
async def driver_routes(driver_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM routes WHERE driver_id = :did AND tenant_id = :tid AND status = 'active'"),
            {"did": driver_id, "tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "driver_id": driver_id}


@app.post("/maintenance/schedule")
async def schedule_maintenance(data: MaintenanceCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO maintenance_schedules (tenant_id, vehicle_id, maintenance_type, scheduled_date, title, description)
               VALUES (:tid, NULLIF(:vid, '')::uuid, :mt, COALESCE(NULLIF(:sd, '')::date, CURRENT_DATE), :title, :desc) RETURNING id"""),
            {"tid": tenant_id, "vid": data.vehicle_id, "mt": data.maintenance_type, "sd": data.scheduled_date,
             "title": data.title, "desc": data.description}
        )
        maint_id = str(result.scalar())
        await s.commit()
        return {"id": maint_id, "status": "scheduled"}


@app.get("/maintenance/upcoming")
async def upcoming_maintenance(tenant_id: str = "default", days: int = 30):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""SELECT * FROM maintenance_schedules WHERE tenant_id = :tid AND status = 'scheduled'
               AND scheduled_date <= CURRENT_DATE + make_interval(days => :days) ORDER BY scheduled_date ASC"""),
            {"tid": tenant_id, "days": days}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows]}


@app.get("/analytics/dashboard")
async def analytics_dashboard(tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        vehicles = (await s.execute(text("SELECT COUNT(*) FROM vehicles WHERE tenant_id = :tid AND status = 'active'"), {"tid": tenant_id})).scalar()
        drivers = (await s.execute(text("SELECT COUNT(*) FROM drivers WHERE tenant_id = :tid AND status = 'available'"), {"tid": tenant_id})).scalar()
        students = (await s.execute(text("SELECT COUNT(*) FROM students WHERE tenant_id = :tid AND status = 'active'"), {"tid": tenant_id})).scalar()
        routes = (await s.execute(text("SELECT COUNT(*) FROM routes WHERE tenant_id = :tid AND status = 'active'"), {"tid": tenant_id})).scalar()
        trips_today = (await s.execute(text("SELECT COUNT(*) FROM trips WHERE tenant_id = :tid AND DATE(scheduled_start_time) = CURRENT_DATE"),
            {"tid": tenant_id}
        )).scalar()
        return {
            "total_vehicles": vehicles,
            "active_vehicles": vehicles,
            "total_drivers": drivers,
            "total_students": students,
            "total_routes": routes,
            "trips_today": trips_today,
        }


@app.get("/vehicles/{vehicle_id}/maintenance")
async def vehicle_maintenance(vehicle_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM maintenance_schedules WHERE vehicle_id = :vid AND tenant_id = :tid ORDER BY scheduled_date DESC"),
            {"vid": vehicle_id, "tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "vehicle_id": vehicle_id}


@app.get("/drivers/{driver_id}/attendance")
async def driver_attendance(driver_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""SELECT DISTINCT ON (a.date) a.*, t.driver_id
                FROM attendance a JOIN trips t ON a.trip_id = t.id
                WHERE t.driver_id = :did AND a.tenant_id = :tid ORDER BY a.date DESC LIMIT 90"""),
            {"did": driver_id, "tid": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "driver_id": driver_id}


class ReportCreate(BaseModel):
    report_type: str
    title: str
    parameters: dict = {}


@app.get("/reports")
async def list_reports(tenant_id: str = "default", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        total = (await s.execute(text("SELECT COUNT(*) FROM reports WHERE tenant_id = :tid"), {"tid": tenant_id})).scalar()
        offset = (page - 1) * limit
        result = await s.execute(text("SELECT * FROM reports WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {"tid": tenant_id, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "total": total, "page": page, "page_size": limit}


@app.post("/reports")
async def create_report(data: ReportCreate, tenant_id: str = "default"):
    import json as _json
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO reports (tenant_id, report_type, title, parameters, status)
               VALUES (:tid, :rt, :title, CAST(:params AS JSONB), 'pending') RETURNING id"""),
            {"tid": tenant_id, "rt": data.report_type, "title": data.title, "params": _json.dumps(data.parameters)}
        )
        report_id = str(result.scalar())
        await s.commit()
    try:
        from backend.workers.celery_app import celery_app
        celery_app.send_task(
            "backend.workers.tasks.report_generator.generate_report",
            args=[report_id, tenant_id, data.report_type],
            queue="reports",
        )
    except Exception:
        pass
    return {"id": report_id, "status": "pending"}


@app.get("/reports/{report_id}")
async def get_report(report_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM reports WHERE id = :id AND tenant_id = :tid"), {"id": report_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Report not found"})
        return dict(row._mapping)


REPORT_CSV_QUERIES = {
    "attendance": "SELECT student_id, date, trip_type, status FROM attendance WHERE tenant_id = $1 ORDER BY date DESC LIMIT 1000",
    "students": "SELECT student_id, first_name, last_name, class_name, section, status FROM students WHERE tenant_id = $1",
    "vehicles": "SELECT plate_number, vehicle_type, status, seating_capacity FROM vehicles WHERE tenant_id = $1",
    "trips": "SELECT route_id, trip_type, status, scheduled_start_time FROM trips WHERE tenant_id = $1 ORDER BY scheduled_start_time DESC LIMIT 1000",
}


@app.get("/reports/{report_id}/download")
async def download_report(report_id: str, tenant_id: str = "default"):
    import csv as _csv
    import io as _io
    from fastapi.responses import StreamingResponse

    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT report_type FROM reports WHERE id = :id AND tenant_id = :tid"), {"id": report_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Report not found"})
        report_type = row[0]
        query = REPORT_CSV_QUERIES.get(report_type)
        if not query:
            raise HTTPException(status_code=400, detail={"code": "BAD_TYPE", "message": f"No data source for report type '{report_type}'"})
        data_result = await s.execute(text(query.replace("$1", ":tid").replace("$2", ":tid")), {"tid": tenant_id})
        rows = data_result.fetchall()
        if not rows:
            output = "(no rows)"
        else:
            headers = list(rows[0]._mapping.keys())
            buf = _io.StringIO()
            writer = _csv.writer(buf)
            writer.writerow(headers)
            for r in rows:
                writer.writerow([str(v) if v is not None else "" for v in r])
            output = buf.getvalue()
        return StreamingResponse(
            iter([output]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{report_type}-report.csv"'},
        )


REPORT_DIR = os.environ.get("REPORT_DIR", "/var/busly/reports")


@app.get("/reports/{report_id}/file")
async def download_report_file(report_id: str, tenant_id: str = "default"):
    from fastapi.responses import FileResponse

    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT report_type, status FROM reports WHERE id = :id AND tenant_id = :tid"), {"id": report_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Report not found"})
        if row[1] != "completed":
            raise HTTPException(status_code=409, detail={"code": "NOT_READY", "message": f"Report is {row[1]}"})
        path = os.path.join(REPORT_DIR, f"{report_id}.csv")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail={"code": "FILE_MISSING", "message": "Generated file not found. Use /download for live data."})
        return FileResponse(path, media_type="text/csv", filename=f"{row[0]}-report.csv")

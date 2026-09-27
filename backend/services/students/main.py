from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app
from redis.asyncio import Redis

from backend.libs.shared.database import TenantRegistry, TenantSessionFactory, TenantEnginePool

redis: Redis = None
tenant_registry: TenantRegistry = None
session_factory: TenantSessionFactory = None
engine_pool: TenantEnginePool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis, tenant_registry, session_factory, engine_pool
    redis = Redis.from_url("redis://localhost:6379", decode_responses=True)
    tenant_registry = TenantRegistry(redis)
    engine_pool = TenantEnginePool()
    session_factory = TenantSessionFactory(tenant_registry, engine_pool)
    yield
    await redis.close()


app = FastAPI(title="Busly Student Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    student_id: str
    class_name: str = ""
    section: str = ""
    gender: str = ""
    date_of_birth: str = ""
    blood_group: str = ""
    father_name: str = ""
    father_phone: str = ""
    mother_name: str = ""
    mother_phone: str = ""
    address: str = ""
    route_id: str = ""
    pickup_stop_id: str = ""
    drop_stop_id: str = ""


class StudentUpdate(BaseModel):
    first_name: str = ""
    last_name: str = ""
    class_name: str = ""
    section: str = ""
    gender: str = ""
    date_of_birth: str = ""
    blood_group: str = ""
    father_name: str = ""
    father_phone: str = ""
    mother_name: str = ""
    mother_phone: str = ""
    address: str = ""
    route_id: str = ""
    pickup_stop_id: str = ""
    drop_stop_id: str = ""
    status: str = ""


class AttendanceBatchItem(BaseModel):
    student_id: str
    status: str
    date: str
    trip_type: str = "pickup"


class AttendanceBatchRequest(BaseModel):
    items: list[AttendanceBatchItem]
    trip_id: str = ""
    marked_by: str = ""


class RidershipEvent(BaseModel):
    trip_id: str
    student_id: str
    vehicle_id: str
    latitude: float = 0.0
    longitude: float = 0.0


@app.get("/health")
async def health():
    return {"status": "ok", "service": "student-service", "version": "1.0.0"}


@app.post("/students")
async def create_student(data: StudentCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(
            """INSERT INTO students (tenant_id, first_name, last_name, student_id, class_name, section, gender,
               date_of_birth, blood_group, father_name, father_phone, mother_name, mother_phone, address,
               route_id, pickup_stop_id, drop_stop_id)
               VALUES (:tid, :fn, :ln, :sid, :cn, :sec, :gen, :dob, :bg, :fan, :fap, :mon, :mop, :addr, :rid, :psid, :dsid)
               RETURNING id""",
            {"tid": tenant_id, "fn": data.first_name, "ln": data.last_name, "sid": data.student_id,
             "cn": data.class_name, "sec": data.section, "gen": data.gender, "dob": data.date_of_birth,
             "bg": data.blood_group, "fan": data.father_name, "fap": data.father_phone,
             "mon": data.mother_name, "mop": data.mother_phone, "addr": data.address,
             "rid": data.route_id, "psid": data.pickup_stop_id, "dsid": data.drop_stop_id}
        )
        student_id = str(result.scalar())
        await s.commit()
        return {"id": student_id, "status": "created"}


@app.get("/students")
async def list_students(tenant_id: str = "default", status: str = "", route_id: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if status:
            where += " AND status = :status"
            params["status"] = status
        if route_id:
            where += " AND route_id = :route_id"
            params["route_id"] = route_id
        total = await s.execute(f"SELECT COUNT(*) FROM students {where}", params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(
            f"SELECT * FROM students {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        students = [dict(r._mapping) for r in rows]
        return {"items": students, "total": total_count, "page": page, "page_size": limit}


@app.get("/students/{student_id}")
async def get_student(student_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute("SELECT * FROM students WHERE id = :id AND tenant_id = :tid", {"id": student_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Student not found"})
        return dict(row._mapping)


@app.put("/students/{student_id}")
async def update_student(student_id: str, data: StudentUpdate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        fields = []
        params = {"id": student_id, "tid": tenant_id}
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None and value != "":
                fields.append(f"{key} = :{key}")
                params[key] = value
        if fields:
            await s.execute(f"UPDATE students SET {', '.join(fields)} WHERE id = :id AND tenant_id = :tid", params)
            await s.commit()
        result = await s.execute("SELECT * FROM students WHERE id = :id AND tenant_id = :tid", {"id": student_id, "tid": tenant_id})
        row = result.fetchone()
        return dict(row._mapping)


@app.delete("/students/{student_id}")
async def delete_student(student_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute("UPDATE students SET status = 'inactive' WHERE id = :id AND tenant_id = :tid", {"id": student_id, "tid": tenant_id})
        await s.commit()
        return {"status": "deleted"}


@app.post("/attendance/bulk")
async def bulk_attendance(data: AttendanceBatchRequest, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    processed = 0
    async for s in session:
        for item in data.items:
            await s.execute(
                """INSERT INTO attendance (tenant_id, student_id, trip_id, date, trip_type, status, check_in_time, marked_by, source)
                   VALUES (:tid, :sid, :tid2, :date, :tt, :status, NOW(), :marked_by, 'bulk')
                   ON CONFLICT (tenant_id, student_id, date, trip_type) DO UPDATE SET status = :status, check_in_time = NOW()""",
                {"tid": tenant_id, "sid": item.student_id, "tid2": data.trip_id, "date": item.date,
                 "tt": item.trip_type, "status": item.status, "marked_by": data.marked_by}
            )
            processed += 1
        await s.commit()
    return {"processed": processed, "status": "ok"}


@app.get("/attendance/daily")
async def daily_attendance(tenant_id: str = "default", date: str = "", trip_type: str = ""):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if date:
            where += " AND date = :date"
            params["date"] = date
        if trip_type:
            where += " AND trip_type = :tt"
            params["tt"] = trip_type
        result = await s.execute(
            f"""SELECT a.*, s.first_name, s.last_name, s.student_id, s.class_name
                FROM attendance a JOIN students s ON a.student_id = s.id
                {where} ORDER BY a.created_at DESC""",
            params
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "date": date}


@app.post("/ridership/check-in")
async def ridership_checkin(data: RidershipEvent, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(
            """INSERT INTO ridership_logs (tenant_id, trip_id, student_id, vehicle_id, action, latitude, longitude)
               VALUES (:tid, :trip_id, :sid, :vid, 'check_in', :lat, :lon)""",
            {"tid": tenant_id, "trip_id": data.trip_id, "sid": data.student_id, "vid": data.vehicle_id,
             "lat": data.latitude, "lon": data.longitude}
        )
        await s.commit()
        return {"status": "checked_in", "student_id": data.student_id, "trip_id": data.trip_id}


@app.post("/ridership/check-out")
async def ridership_checkout(data: RidershipEvent, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(
            """INSERT INTO ridership_logs (tenant_id, trip_id, student_id, vehicle_id, action, latitude, longitude)
               VALUES (:tid, :trip_id, :sid, :vid, 'check_out', :lat, :lon)""",
            {"tid": tenant_id, "trip_id": data.trip_id, "sid": data.student_id, "vid": data.vehicle_id,
             "lat": data.latitude, "lon": data.longitude}
        )
        await s.commit()
        return {"status": "checked_out", "student_id": data.student_id, "trip_id": data.trip_id}


@app.get("/ridership/trip/{trip_id}")
async def trip_ridership(trip_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(
            """SELECT r.*, s.first_name, s.last_name, s.student_id
               FROM ridership_logs r JOIN students s ON r.student_id = s.id
               WHERE r.trip_id = :tid AND r.tenant_id = :tid2 ORDER BY r.timestamp ASC""",
            {"tid": trip_id, "tid2": tenant_id}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "trip_id": trip_id}

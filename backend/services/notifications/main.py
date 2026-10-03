import os
from contextlib import asynccontextmanager
from sqlalchemy import text
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
    redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
    tenant_registry = TenantRegistry(redis)
    engine_pool = TenantEnginePool()
    session_factory = TenantSessionFactory(tenant_registry, engine_pool)
    yield
    await redis.close()


app = FastAPI(title="Busly Notification Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class NotificationCreate(BaseModel):
    user_id: str = ""
    title: str
    body: str
    channel: str = "push"
    notification_type: str = "info"


class AlertCreate(BaseModel):
    alert_type: str
    title: str
    message: str
    vehicle_id: str = ""
    driver_id: str = ""
    student_id: str = ""
    route_id: str = ""
    severity: str = "medium"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "notification-service", "version": "1.0.0"}


@app.get("/notifications")
async def list_notifications(tenant_id: str = "default", user_id: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if user_id:
            where += " AND user_id = :uid"
            params["uid"] = user_id
        total = await s.execute(text(f"SELECT COUNT(*) FROM notifications {where}"), params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM notifications {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "total": total_count, "page": page, "page_size": limit}


@app.post("/notifications")
async def send_notification(data: NotificationCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO notifications (tenant_id, user_id, title, body, channel, notification_type, status, sent_at)
               VALUES (:tid, NULLIF(:uid, '')::uuid, :title, :body, :channel, :ntype, 'sent', NOW()) RETURNING id"""),
            {"tid": tenant_id, "uid": data.user_id, "title": data.title, "body": data.body,
             "channel": data.channel, "ntype": data.notification_type}
        )
        notif_id = str(result.scalar())
        await s.commit()
        return {"status": "sent", "id": notif_id}


@app.get("/alerts")
async def list_alerts(tenant_id: str = "default", is_read: str = "", severity: str = "", page: int = 1, limit: int = 20):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        where = "WHERE tenant_id = :tid"
        params = {"tid": tenant_id}
        if is_read != "":
            where += " AND is_read = :is_read"
            params["is_read"] = is_read.lower() == "true"
        if severity:
            where += " AND severity = :severity"
            params["severity"] = severity
        total = await s.execute(text(f"SELECT COUNT(*) FROM alerts {where}"), params)
        total_count = total.scalar()
        offset = (page - 1) * limit
        result = await s.execute(text(f"SELECT * FROM alerts {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {**params, "limit": limit, "offset": offset}
        )
        rows = result.fetchall()
        return {"items": [dict(r._mapping) for r in rows], "total": total_count, "page": page, "page_size": limit}


@app.post("/alerts")
async def create_alert(data: AlertCreate, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("""INSERT INTO alerts (tenant_id, alert_type, title, message, vehicle_id, driver_id, student_id, route_id, severity)
               VALUES (:tid, :at, :title, :msg, NULLIF(:vid, '')::uuid, NULLIF(:did, '')::uuid, NULLIF(:sid, '')::uuid, NULLIF(:rid, '')::uuid, :sev) RETURNING id"""),
            {"tid": tenant_id, "at": data.alert_type, "title": data.title, "msg": data.message,
             "vid": data.vehicle_id, "did": data.driver_id, "sid": data.student_id,
             "rid": data.route_id, "sev": data.severity}
        )
        alert_id = str(result.scalar())
        await s.commit()
        return {"id": alert_id, "status": "active"}


@app.get("/alerts/{alert_id}")
async def get_alert(alert_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT * FROM alerts WHERE id = :id AND tenant_id = :tid"), {"id": alert_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Alert not found"})
        return dict(row._mapping)


@app.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE alerts SET is_read = true WHERE id = :id AND tenant_id = :tid"), {"id": alert_id, "tid": tenant_id})
        await s.commit()
        return {"id": alert_id, "status": "read"}


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(text("UPDATE alerts SET is_resolved = true, resolved_at = NOW() WHERE id = :id AND tenant_id = :tid"),
            {"id": alert_id, "tid": tenant_id}
        )
        await s.commit()
        return {"id": alert_id, "status": "resolved"}

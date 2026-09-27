from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app
from redis.asyncio import Redis
from datetime import datetime
import json

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


app = FastAPI(title="Busly AI Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    user_id: str = ""


class ChatResponse(BaseModel):
    response: str
    intent: str
    session_id: str


class RouteOptimizeRequest(BaseModel):
    route_id: str
    tenant_id: str = "default"


class ETAPredictionRequest(BaseModel):
    vehicle_id: str
    stop_id: str
    tenant_id: str = "default"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service", "version": "1.0.0"}


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(data: ChatRequest, tenant_id: str = "default"):
    session_id = data.session_id or f"session_{datetime.utcnow().timestamp()}"
    intent = _detect_intent(data.message)
    response = _generate_response(data.message, intent, tenant_id)

    session = session_factory.get_session(tenant_id)
    async for s in session:
        await s.execute(
            """INSERT INTO chat_messages (tenant_id, user_id, session_id, role, content, intent)
               VALUES (:tid, :uid, :sid, 'user', :content, :intent)""",
            {"tid": tenant_id, "uid": data.user_id, "sid": session_id, "content": data.message, "intent": intent}
        )
        await s.execute(
            """INSERT INTO chat_messages (tenant_id, user_id, session_id, role, content, intent)
               VALUES (:tid, :uid, :sid, 'assistant', :content, :intent)""",
            {"tid": tenant_id, "uid": data.user_id, "sid": session_id, "content": response, "intent": intent}
        )
        await s.commit()

    return ChatResponse(response=response, intent=intent, session_id=session_id)


@app.post("/ai/optimize-route")
async def optimize_route(data: RouteOptimizeRequest):
    task_id = f"opt_{datetime.utcnow().timestamp()}"
    return {"task_id": task_id, "status": "queued", "route_id": data.route_id}


@app.get("/ai/optimize-route/{task_id}/status")
async def optimize_route_status(task_id: str):
    return {"task_id": task_id, "status": "completed", "optimized_order": []}


@app.post("/ai/eta")
async def predict_eta(data: ETAPredictionRequest):
    session = session_factory.get_session(data.tenant_id)
    async for s in session:
        result = await s.execute(
            """SELECT speed, recorded_at FROM gps_locations
               WHERE vehicle_id = :vid AND tenant_id = :tid ORDER BY recorded_at DESC LIMIT 1""",
            {"vid": data.vehicle_id, "tid": data.tenant_id}
        )
        row = result.fetchone()
        speed = row[0] if row else 30
        eta_minutes = max(1, int(1000 / max(speed, 5) * 60))
        return {"vehicle_id": data.vehicle_id, "stop_id": data.stop_id, "eta_minutes": eta_minutes, "confidence": 0.85}


@app.get("/ai/insights")
async def get_insights(tenant_id: str = "default"):
    session = session_factory.get_session(tenant_id)
    async for s in session:
        total_trips = await s.execute("SELECT COUNT(*) FROM trips WHERE tenant_id = :tid", {"tid": tenant_id})
        completed_trips = await s.execute(
            "SELECT COUNT(*) FROM trips WHERE tenant_id = :tid AND status = 'completed'", {"tid": tenant_id}
        )
        total_students = await s.execute(
            "SELECT COUNT(*) FROM students WHERE tenant_id = :tid AND status = 'active'", {"tid": tenant_id}
        )
        total_vehicles = await s.execute(
            "SELECT COUNT(*) FROM vehicles WHERE tenant_id = :tid AND status = 'active'", {"tid": tenant_id}
        )
        return {
            "total_trips": total_trips.scalar(),
            "completed_trips": completed_trips.scalar(),
            "completion_rate": round(completed_trips.scalar() / max(total_trips.scalar(), 1) * 100, 1),
            "total_students": total_students.scalar(),
            "total_vehicles": total_vehicles.scalar(),
            "insights": [
                "Route optimization can reduce travel time by 15-20%",
                "Peak hours are between 7:00-8:30 AM and 3:00-4:30 PM",
                "Consider adding a second trip for Route 3 during peak hours",
            ]
        }


def _detect_intent(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["track", "where", "location", "bus", "arrive", "eta"]):
        return "tracking"
    if any(w in msg for w in ["attendance", "present", "absent"]):
        return "attendance"
    if any(w in msg for w in ["route", "stop", "schedule"]):
        return "routing"
    if any(w in msg for w in ["fee", "payment", "cost"]):
        return "fees"
    if any(w in msg for w in ["report", "analytics", "stats"]):
        return "reports"
    return "general"


def _generate_response(message: str, intent: str, tenant_id: str) -> str:
    responses = {
        "tracking": "I can help you track your bus in real-time. Please provide your student's name or route number, and I'll get the current location and ETA for you.",
        "attendance": "I can check attendance records. Please provide the student's name or ID, and I'll retrieve their attendance status for today.",
        "routing": "I can help with route information. Please provide the route number or stop name, and I'll show you the schedule and stops.",
        "fees": "I can help with fee-related queries. Please provide the student's name or ID, and I'll check their fee status.",
        "reports": "I can generate various reports including attendance, fleet utilization, and route performance. Which report would you like?",
        "general": "Hello! I'm the Busly AI assistant. I can help you with bus tracking, attendance, routes, fees, and reports. How can I assist you today?",
    }
    return responses.get(intent, responses["general"])

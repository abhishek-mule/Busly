import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app
from redis.asyncio import Redis

from backend.libs.shared.database import TenantRegistry, TenantEnginePool
from backend.services.tenant.db import create_tenant_database, run_tenant_migrations, drop_tenant_database, get_tenant_connection_string

logger = logging.getLogger("busly.tenant")
redis: Redis = None
tenant_registry: TenantRegistry = None
engine_pool: TenantEnginePool = None


async def bootstrap_default_tenant() -> None:
    for attempt in range(30):
        try:
            await create_tenant_database("default")
            await run_tenant_migrations("default")
            context = await get_tenant_connection_string("default")
            await tenant_registry.set(context)
            logger.info("default tenant provisioned")
            return
        except Exception as e:
            logger.warning("tenant bootstrap attempt %d failed: %s", attempt + 1, e)
            await asyncio.sleep(2)
    logger.error("tenant bootstrap failed after retries")


async def _registry_keepalive() -> None:
    while True:
        await asyncio.sleep(600)
        try:
            context = await tenant_registry.get("default")
            if not context:
                await bootstrap_default_tenant()
        except Exception as e:
            logger.warning("registry keepalive failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis, tenant_registry, engine_pool
    redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
    tenant_registry = TenantRegistry(redis)
    engine_pool = TenantEnginePool()
    await bootstrap_default_tenant()
    keepalive = asyncio.create_task(_registry_keepalive())
    yield
    keepalive.cancel()
    await redis.close()


app = FastAPI(title="Busly Tenant Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class TenantCreate(BaseModel):
    tenant_id: str
    company_name: str
    email: str
    phone: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    country: str = "India"
    pincode: str = ""


class TenantResponse(BaseModel):
    tenant_id: str
    company_name: str
    email: str
    status: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tenant-service", "version": "1.0.0"}


@app.post("/tenants", response_model=TenantResponse)
async def provision_tenant(data: TenantCreate):
    try:
        db_url = await create_tenant_database(data.tenant_id)
        await run_tenant_migrations(data.tenant_id)
        context = await get_tenant_connection_string(data.tenant_id)
        await tenant_registry.set(context)
        return TenantResponse(tenant_id=data.tenant_id, company_name=data.company_name, email=data.email, status="active")
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "PROVISION_FAILED", "message": str(e)})


@app.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str):
    context = await tenant_registry.get(tenant_id)
    if not context:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": f"Tenant {tenant_id} not found"})
    return {"tenant_id": tenant_id, "status": "active", "schema": context.schema_name}


@app.get("/tenants/{tenant_id}/status")
async def tenant_health(tenant_id: str):
    try:
        context = await tenant_registry.get(tenant_id)
        if not context:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": f"Tenant {tenant_id} not found"})
        return {"tenant_id": tenant_id, "status": "healthy", "schema": context.schema_name}
    except HTTPException:
        raise
    except Exception as e:
        return {"tenant_id": tenant_id, "status": "unhealthy", "error": str(e)}


@app.post("/tenants/{tenant_id}/migrate")
async def migrate_tenant(tenant_id: str):
    try:
        await run_tenant_migrations(tenant_id)
        await tenant_registry.invalidate(tenant_id)
        return {"tenant_id": tenant_id, "status": "migrated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "MIGRATION_FAILED", "message": str(e)})


@app.delete("/tenants/{tenant_id}")
async def decommission_tenant(tenant_id: str):
    try:
        await drop_tenant_database(tenant_id)
        await tenant_registry.invalidate(tenant_id)
        return {"tenant_id": tenant_id, "status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "DECOMMISSION_FAILED", "message": str(e)})


@app.post("/tenants/{tenant_id}/rotate-secret")
async def rotate_secret(tenant_id: str):
    try:
        db_url = await create_tenant_database(tenant_id, rotate=True)
        await tenant_registry.invalidate(tenant_id)
        return {"tenant_id": tenant_id, "status": "rotated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "ROTATE_FAILED", "message": str(e)})

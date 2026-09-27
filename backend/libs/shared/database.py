import json
from typing import AsyncGenerator, Optional
from datetime import timedelta

import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from redis.asyncio import Redis

from backend.libs.shared.models import TenantContext


class Base(DeclarativeBase):
    pass


class TenantRegistry:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.ttl = 300

    async def get(self, tenant_id: str) -> Optional[TenantContext]:
        key = f"tenant:{tenant_id}:db"
        data = await self.redis.get(key)
        if data:
            return TenantContext(**json.loads(data))
        return None

    async def set(self, context: TenantContext) -> None:
        key = f"tenant:{context.tenant_id}:db"
        await self.redis.setex(key, timedelta(seconds=self.ttl), context.model_dump_json())

    async def invalidate(self, tenant_id: str) -> None:
        await self.redis.delete(f"tenant:{tenant_id}:db")


class TenantEnginePool:
    def __init__(self):
        self._engines: dict[str, tuple] = {}
        self._max_connections = 20

    async def get_engine(self, db_url: str):
        if db_url not in self._engines:
            engine = create_async_engine(
                db_url,
                pool_size=self._max_connections,
                max_overflow=5,
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            self._engines[db_url] = (engine, async_sessionmaker(engine, expire_on_commit=False))
        return self._engines[db_url]

    async def dispose(self, db_url: str) -> None:
        if db_url in self._engines:
            engine, _ = self._engines.pop(db_url)
            await engine.dispose()


class TenantSessionFactory:
    def __init__(self, registry: TenantRegistry, pool: TenantEnginePool):
        self.registry = registry
        self.pool = pool

    async def get_session(self, tenant_id: str) -> AsyncGenerator[AsyncSession, None]:
        context = await self.registry.get(tenant_id)
        if not context:
            raise ValueError(f"Tenant {tenant_id} not found")
        _, session_maker = await self.pool.get_engine(context.db_url)
        async with session_maker() as session:
            yield session


async def run_migrations(shared_engine_url: str, tenant_db_urls: list[str] | None = None) -> None:
    urls = [shared_engine_url] + (tenant_db_urls or [])
    for url in urls:
        sync_url = url.replace("+asyncpg", "").replace("+psycopg", "")
        conn = await asyncpg.connect(sync_url)
        try:
            await conn.execute("CREATE SCHEMA IF NOT EXISTS busly")
        finally:
            await conn.close()

import os
from pathlib import Path

import asyncpg

SHARED_DB_URL = os.environ.get("SHARED_DB_URL", "postgresql://busly:password@localhost:5432/busly")
DB_USER = os.environ.get("DB_USER", "busly")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "password")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
ASYNC_PREFIX = os.environ.get("ASYNC_PREFIX", "postgresql+asyncpg://busly:password@localhost:5432")


async def _sync_url(db_name: str = "") -> str:
    return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{db_name or 'busly'}"


def _async_url(db_name: str = "") -> str:
    return f"{ASYNC_PREFIX}/{db_name}" if db_name else ASYNC_PREFIX


async def create_tenant_database(tenant_id: str, rotate: bool = False) -> str:
    conn = await asyncpg.connect(await _sync_url())
    try:
        db_name = f"tenant_{tenant_id}"
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
        return _async_url(db_name)
    finally:
        await conn.close()


async def run_tenant_migrations(tenant_id: str) -> None:
    db_name = f"tenant_{tenant_id}"
    conn = await asyncpg.connect(await _sync_url(db_name))
    try:
        await conn.execute("CREATE SCHEMA IF NOT EXISTS busly")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        schema_path = Path(__file__).with_name("schema.sql")
        with open(schema_path) as f:
            sql = f.read()
        await conn.execute(sql)
    finally:
        await conn.close()


async def drop_tenant_database(tenant_id: str) -> None:
    conn = await asyncpg.connect(await _sync_url())
    try:
        db_name = f"tenant_{tenant_id}"
        await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    finally:
        await conn.close()


async def get_tenant_connection_string(tenant_id: str):
    from backend.libs.shared.models import TenantContext
    db_name = f"tenant_{tenant_id}"
    return TenantContext(
        tenant_id=tenant_id,
        db_url=_async_url(db_name),
        schema_name="busly",
    )

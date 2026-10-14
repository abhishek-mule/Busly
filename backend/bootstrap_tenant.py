"""One-shot tenant bootstrap for single-container deploys.

Runs the same provisioning as the tenant-service lifespan (create the
default tenant database, run migrations, store the connection context in
Redis), then exits so the long-running tenant API -- which nothing calls
at runtime -- doesn't consume RAM on tiny free-tier containers.

Exits non-zero when the default tenant is still missing afterwards, so a
broken database/Redis config fails the container visibly at boot instead
of serving a silently broken API.
"""
import asyncio
import os
import sys

from redis.asyncio import Redis

from backend.libs.shared.database import TenantRegistry
from backend.services.tenant import main as tenant_main


async def run() -> int:
    redis = Redis.from_url(
        os.environ.get("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True,
    )
    tenant_main.redis = redis
    tenant_main.tenant_registry = TenantRegistry(redis)
    try:
        await tenant_main.bootstrap_default_tenant()
        context = await tenant_main.tenant_registry.get("default")
        if not context:
            print(
                "busly: tenant bootstrap finished but default tenant missing",
                flush=True,
            )
            return 1
        print("busly: default tenant ready", flush=True)
        return 0
    finally:
        await redis.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))

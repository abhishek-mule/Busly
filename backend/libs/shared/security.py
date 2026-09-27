import time
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Any

import bcrypt
import jwt
from redis.asyncio import Redis

logger = logging.getLogger("busly.security")


class JWTManager:
    def __init__(self, public_keys: dict[str, str], private_key: Optional[str] = None):
        self.public_keys = public_keys
        self.private_key = private_key
        self.algorithm = "RS256"

    def create_access_token(self, user_id: str, tenant_id: str, roles: list[str], expires_delta: timedelta = timedelta(hours=1)) -> str:
        payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "roles": roles,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + expires_delta,
            "type": "access",
        }
        return jwt.encode(payload, self.private_key, algorithm=self.algorithm)

    def create_refresh_token(self, user_id: str, tenant_id: str, expires_delta: timedelta = timedelta(days=30)) -> str:
        payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + expires_delta,
            "type": "refresh",
        }
        return jwt.encode(payload, self.private_key, algorithm=self.algorithm)

    def decode_token(self, token: str) -> dict[str, Any]:
        payload = jwt.decode(token, options={"verify_signature": False})
        kid = payload.get("kid", "default")
        key = self.public_keys.get(kid) or list(self.public_keys.values())[0]
        return jwt.decode(token, key, algorithms=[self.algorithm])


class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def check(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = int(time.time())
        window_start = now - window_seconds
        lua_script = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local max = tonumber(ARGV[3])
            local window_start = now - window
            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
            local count = redis.call('ZCARD', key)
            if count < max then
                redis.call('ZADD', key, now, now .. ':' .. math.random())
                redis.call('EXPIRE', key, window)
                return {1, max - count - 1}
            else
                return {0, 0}
            end
        """
        result = await self.redis.eval(lua_script, 1, key, now, window_seconds, max_requests)
        allowed = bool(result[0])
        remaining = int(result[1])
        return allowed, remaining


class PasswordHasher:
    def __init__(self, work_factor: int = 12):
        self.work_factor = work_factor

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(self.work_factor)).decode()

    def verify_password(self, password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode(), password_hash.encode())


class AuditLogger:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def log_event(self, user_id: str, tenant_id: str, action: str, resource: str, details: Optional[dict] = None) -> None:
        event = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "action": action,
            "resource": resource,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
        }
        key = f"audit:{tenant_id}:{int(time.time())}"
        await self.redis.setex(key, 86400 * 90, str(event))
        logger.info("audit_event", extra=event)

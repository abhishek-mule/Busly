import uuid
import os
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Optional
from sqlalchemy import text
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from pydantic import BaseModel, EmailStr
from prometheus_client import make_asgi_app
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.libs.shared.security import JWTManager, PasswordHasher, RateLimiter, AuditLogger
from backend.libs.shared.database import TenantRegistry, TenantSessionFactory, TenantEnginePool

redis: Redis = None
jwt_manager: JWTManager = None
password_hasher: PasswordHasher = None
rate_limiter: RateLimiter = None
audit_logger: AuditLogger = None
tenant_registry: TenantRegistry = None
session_factory: TenantSessionFactory = None
engine_pool: TenantEnginePool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis, jwt_manager, password_hasher, rate_limiter, audit_logger, tenant_registry, session_factory, engine_pool
    redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
    private_key = open("/etc/keys/private.pem").read()
    public_keys = {"default": open("/etc/keys/public.pem").read()}
    jwt_manager = JWTManager(public_keys=public_keys, private_key=private_key)
    password_hasher = PasswordHasher()
    rate_limiter = RateLimiter(redis)
    audit_logger = AuditLogger(redis)
    tenant_registry = TenantRegistry(redis)
    engine_pool = TenantEnginePool()
    session_factory = TenantSessionFactory(tenant_registry, engine_pool)
    yield
    await redis.close()


app = FastAPI(title="Busly Auth Service", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class RegisterRequest(BaseModel):
    tenant_id: str = "default"
    email: EmailStr
    password: str
    full_name: str
    phone: str = ""
    roles: list[str] = ["driver"]


class CreateUserRequest(BaseModel):
    tenant_id: str = "default"
    email: EmailStr
    password: str
    full_name: str
    phone: str = ""
    roles: list[str] = ["driver"]


class LogoutRequest(BaseModel):
    refresh_token: str = ""


SELF_REGISTER_ROLES = {"driver", "parent", "teacher"}
ALL_ROLES = {"driver", "parent", "teacher", "admin", "superadmin"}


def _check_rate_limit(key: str, limit: int, window: int):
    async def _dep(request: Request):
        ident = request.client.host if request.client else "unknown"
        allowed, _ = await rate_limiter.check(f"{key}:{ident}", limit, window)
        if not allowed:
            raise HTTPException(status_code=429, detail={"code": "RATE_LIMITED", "message": "Too many attempts. Try again later."})
    return _dep


def _revoked_key(token: str) -> str:
    import hashlib
    return f"refresh:revoked:{hashlib.sha256(token.encode()).hexdigest()}"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_id: str = "default"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str
    roles: list[str]
    role: str = "admin"
    is_active: bool


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "NO_TOKEN", "message": "Missing or invalid Authorization header"})
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt_manager.decode_token(token)
        return {"user_id": payload["sub"], "tenant_id": payload["tenant_id"], "roles": payload.get("roles", [])}
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"})


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth-service", "version": "1.0.0"}


@app.post("/auth/register", response_model=TokenResponse)
async def register(data: RegisterRequest, request: Request):
    await _check_rate_limit("register", 5, 300)(request)
    roles = data.roles or ["driver"]
    if not set(roles) <= SELF_REGISTER_ROLES:
        raise HTTPException(status_code=403, detail={"code": "ROLE_NOT_ALLOWED", "message": "Self-registration is limited to driver, parent and teacher accounts"})
    try:
        session = session_factory.get_session(data.tenant_id)
    except ValueError:
        raise HTTPException(status_code=404, detail={"code": "TENANT_NOT_FOUND", "message": "Unknown organization"})
    async for s in session:
        existing = await s.execute(text("SELECT id FROM users WHERE email = :email AND tenant_id = :tid"), {"email": data.email, "tid": data.tenant_id})
        if existing.scalar():
            raise HTTPException(status_code=409, detail={"code": "EMAIL_EXISTS", "message": "User already exists"})
        password_hash = password_hasher.hash_password(data.password)
        result = await s.execute(text("INSERT INTO users (tenant_id, email, password_hash, full_name, phone, roles) VALUES (:tid, :email, :ph, :fn, :phone, :roles) RETURNING id"),
            {"tid": data.tenant_id, "email": data.email, "ph": password_hash, "fn": data.full_name, "phone": data.phone, "roles": roles},
        )
        user_id = str(result.scalar())
        await s.commit()
    access = jwt_manager.create_access_token(user_id, data.tenant_id, roles)
    refresh = jwt_manager.create_refresh_token(user_id, data.tenant_id)
    await audit_logger.log_event(user_id, data.tenant_id, "user.register", f"users/{user_id}")
    return TokenResponse(access_token=access, refresh_token=refresh, expires_in=3600)


@app.post("/auth/users", response_model=UserResponse)
async def create_user(data: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin-only user creation (any role, including admin)."""
    if "admin" not in (current_user.get("roles") or []) and "superadmin" not in (current_user.get("roles") or []):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Admin access required"})
    roles = data.roles or ["driver"]
    if not set(roles) <= ALL_ROLES:
        raise HTTPException(status_code=422, detail={"code": "INVALID_ROLE", "message": f"Unknown role. Allowed: {sorted(ALL_ROLES)}"})
    tenant_id = current_user["tenant_id"]
    try:
        session = session_factory.get_session(tenant_id)
    except ValueError:
        raise HTTPException(status_code=404, detail={"code": "TENANT_NOT_FOUND", "message": "Unknown organization"})
    async for s in session:
        existing = await s.execute(text("SELECT id FROM users WHERE email = :email AND tenant_id = :tid"), {"email": data.email, "tid": tenant_id})
        if existing.scalar():
            raise HTTPException(status_code=409, detail={"code": "EMAIL_EXISTS", "message": "User already exists"})
        password_hash = password_hasher.hash_password(data.password)
        result = await s.execute(text("INSERT INTO users (tenant_id, email, password_hash, full_name, phone, roles) VALUES (:tid, :email, :ph, :fn, :phone, :roles) RETURNING id"),
            {"tid": tenant_id, "email": data.email, "ph": password_hash, "fn": data.full_name, "phone": data.phone, "roles": roles},
        )
        user_id = str(result.scalar())
        await s.commit()
    await audit_logger.log_event(current_user["user_id"], tenant_id, "user.create", f"users/{user_id}")
    return UserResponse(id=user_id, email=data.email, full_name=data.full_name, phone=data.phone, roles=roles, role=roles[0], is_active=True)


@app.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request):
    await _check_rate_limit("login", 10, 60)(request)
    try:
        session = session_factory.get_session(data.tenant_id)
    except ValueError:
        raise HTTPException(status_code=404, detail={"code": "TENANT_NOT_FOUND", "message": "Unknown organization"})
    async for s in session:
        result = await s.execute(text("SELECT id, password_hash, roles, is_active FROM users WHERE email = :email AND tenant_id = :tid"), {"email": data.email, "tid": data.tenant_id})
        row = result.fetchone()
        if not row or not password_hasher.verify_password(data.password, row[1]):
            raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"})
        if not row[3]:
            raise HTTPException(status_code=403, detail={"code": "ACCOUNT_DISABLED", "message": "Account is disabled"})
        user_id = str(row[0])
        roles = row[2]
    access = jwt_manager.create_access_token(user_id, data.tenant_id, roles)
    refresh = jwt_manager.create_refresh_token(user_id, data.tenant_id)
    await audit_logger.log_event(user_id, data.tenant_id, "user.login", f"users/{user_id}")
    return TokenResponse(access_token=access, refresh_token=refresh, expires_in=3600)


@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest):
    if await redis.exists(_revoked_key(data.refresh_token)):
        raise HTTPException(status_code=401, detail={"code": "TOKEN_REVOKED", "message": "Session has been signed out"})
    try:
        payload = jwt_manager.decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail={"code": "INVALID_TOKEN_TYPE", "message": "Not a refresh token"})
        user_id = payload["sub"]
        tenant_id = payload["tenant_id"]
        try:
            session = session_factory.get_session(tenant_id)
        except ValueError:
            raise HTTPException(status_code=404, detail={"code": "TENANT_NOT_FOUND", "message": "Unknown organization"})
        async for s in session:
            result = await s.execute(text("SELECT roles FROM users WHERE id = :id AND tenant_id = :tid"), {"id": user_id, "tid": tenant_id})
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail={"code": "USER_NOT_FOUND", "message": "User not found"})
            roles = row[0]
        access = jwt_manager.create_access_token(user_id, tenant_id, roles)
        new_refresh = jwt_manager.create_refresh_token(user_id, tenant_id)
        return TokenResponse(access_token=access, refresh_token=new_refresh, expires_in=3600)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Invalid refresh token"})


@app.post("/auth/logout")
async def logout(data: LogoutRequest):
    if data.refresh_token:
        # Revoke the refresh token so the session cannot be renewed (30d TTL matches refresh lifetime)
        await redis.setex(_revoked_key(data.refresh_token), 86400 * 30, "1")
    return {"status": "ok", "message": "Logged out"}


@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    tenant_id = current_user["tenant_id"]
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT id, email, full_name, phone, roles, is_active FROM users WHERE id = :id AND tenant_id = :tid"), {"id": user_id, "tid": tenant_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "User not found"})
        return UserResponse(id=str(row[0]), email=row[1], full_name=row[2], phone=row[3], roles=row[4], role=(row[4][0] if row[4] else "admin"), is_active=row[5])


@app.put("/auth/me")
async def update_me(data: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    tenant_id = current_user["tenant_id"]
    session = session_factory.get_session(tenant_id)
    async for s in session:
        fields = []
        params = {"id": user_id, "tid": tenant_id}
        if data.full_name:
            fields.append("full_name = :fn")
            params["fn"] = data.full_name
        if data.email:
            fields.append("email = :email")
            params["email"] = data.email
        if data.phone:
            fields.append("phone = :phone")
            params["phone"] = data.phone
        if fields:
            await s.execute(text(f"UPDATE users SET {', '.join(fields)} WHERE id = :id AND tenant_id = :tid"), params)
            await s.commit()
        result = await s.execute(text("SELECT id, email, full_name, phone, roles, is_active FROM users WHERE id = :id AND tenant_id = :tid"), {"id": user_id, "tid": tenant_id})
        row = result.fetchone()
        return UserResponse(id=str(row[0]), email=row[1], full_name=row[2], phone=row[3], roles=row[4], role=(row[4][0] if row[4] else "admin"), is_active=row[5])


@app.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    tenant_id = current_user["tenant_id"]
    session = session_factory.get_session(tenant_id)
    async for s in session:
        result = await s.execute(text("SELECT password_hash FROM users WHERE id = :id AND tenant_id = :tid"),
            {"id": user_id, "tid": tenant_id})
        row = result.fetchone()
        if not row or not password_hasher.verify_password(data.old_password, row[0]):
            raise HTTPException(status_code=401, detail={"code": "INVALID_PASSWORD", "message": "Current password is incorrect"})
        new_hash = password_hasher.hash_password(data.new_password)
        await s.execute(text("UPDATE users SET password_hash = :ph WHERE id = :id AND tenant_id = :tid"),
            {"ph": new_hash, "id": user_id, "tid": tenant_id})
        await s.commit()
        return {"status": "ok", "message": "Password changed"}

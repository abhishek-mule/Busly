from typing import TypedDict
from urllib.parse import parse_qsl, urlencode
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
import httpx

from backend.libs.shared.security import JWTManager

router = APIRouter()

_verifier: JWTManager | None = None


def _get_verifier() -> JWTManager | None:
    global _verifier
    if _verifier is None:
        try:
            with open("/etc/keys/public.pem") as f:
                _verifier = JWTManager(public_keys={"default": f.read()})
        except OSError:
            _verifier = None
    return _verifier


class RouteConfig(TypedDict):
    target: str
    rate_limit: int
    auth_required: bool
    scopes: list[str]


ROUTE_TABLE: dict[str, RouteConfig] = {
    "/api/v1/auth": {"target": "http://auth-service:8001", "rate_limit": 100, "auth_required": False, "scopes": []},
    "/api/v1/vehicles": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver", "parent"]},
    "/api/v1/drivers": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/maintenance": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin"]},
    "/api/v1/fleet": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/routes": {"target": "http://routing-service:8003", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver", "teacher", "parent"]},
    "/api/v1/stops": {"target": "http://routing-service:8003", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver", "teacher", "parent"]},
    "/api/v1/trips": {"target": "http://routing-service:8003", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver", "parent"]},
    "/api/v1/students": {"target": "http://student-service:8004", "rate_limit": 80, "auth_required": True, "scopes": ["admin", "teacher", "driver", "parent"]},
    "/api/v1/attendance": {"target": "http://student-service:8004", "rate_limit": 80, "auth_required": True, "scopes": ["admin", "teacher", "driver", "parent"]},
    "/api/v1/ridership": {"target": "http://student-service:8004", "rate_limit": 80, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/gps": {"target": "http://geo-service:8005", "rate_limit": 120, "auth_required": True, "scopes": ["admin", "driver", "parent"]},
    "/api/v1/geo": {"target": "http://geo-service:8005", "rate_limit": 120, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/tenants": {"target": "http://tenant-service:8006", "rate_limit": 20, "auth_required": True, "scopes": ["superadmin"]},
    "/api/v1/notifications": {"target": "http://notification-service:8008", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "teacher", "driver"]},
    "/api/v1/alerts": {"target": "http://notification-service:8008", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "teacher", "driver"]},
    "/api/v1/reports": {"target": "http://fleet-service:8002", "rate_limit": 30, "auth_required": True, "scopes": ["admin"]},
    "/api/v1/analytics": {"target": "http://fleet-service:8002", "rate_limit": 30, "auth_required": True, "scopes": ["admin"]},
}


def _match_route(path: str) -> tuple[str, RouteConfig]:
    for prefix, config in sorted(ROUTE_TABLE.items(), key=lambda x: -len(x[0])):
        if path.startswith(prefix):
            return prefix, config
    raise ValueError(f"No route configured for {path}")


def _deny(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code, "message": message})


def _enforce_auth(request: Request, config: RouteConfig) -> dict | JSONResponse:
    """Validate Bearer token + role scopes. Returns token payload or an error response."""
    if not config["auth_required"]:
        return {}
    verifier = _get_verifier()
    if verifier is None:
        return _deny(503, "AUTH_UNAVAILABLE", "Authentication service is not configured")
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return _deny(401, "NO_TOKEN", "Missing or invalid Authorization header")
    try:
        payload = verifier.decode_token(auth.split(" ", 1)[1])
    except Exception:
        return _deny(401, "INVALID_TOKEN", "Invalid or expired token")
    if payload.get("type") != "access":
        return _deny(401, "INVALID_TOKEN", "Refresh tokens cannot access the API")
    roles = payload.get("roles", []) or []
    if not set(roles) & set(config["scopes"]):
        return _deny(403, "FORBIDDEN", "Your role is not allowed to access this resource")
    return payload
    for prefix, config in sorted(ROUTE_TABLE.items(), key=lambda x: -len(x[0])):
        if path.startswith(prefix):
            return prefix, config
    raise ValueError(f"No route configured for {path}")


API_PREFIX = "/api/v1"


async def proxy_request(method: str, target_url: str, request: Request, extra_headers: dict | None = None) -> Response:
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    if extra_headers:
        headers.update({k: v for k, v in extra_headers.items() if v})
    body = await request.body()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, target_url, headers=headers, content=body)
    excluded = ("content-length", "content-encoding", "transfer-encoding", "connection")
    out_headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}
    if not resp.content:
        return JSONResponse(content={}, status_code=resp.status_code, headers=out_headers)
    try:
        return JSONResponse(content=resp.json(), status_code=resp.status_code, headers=out_headers)
    except ValueError:
        return Response(content=resp.content, status_code=resp.status_code,
                        media_type=resp.headers.get("content-type", "application/octet-stream"),
                        headers=out_headers)


@router.get("/api/v1")
async def api_index():
    return {
        "name": "Busly API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": sorted(ROUTE_TABLE.keys()),
        "hint": "Authenticate via POST /api/v1/auth/login and send Authorization: Bearer <token>",
    }


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway_proxy(path: str, request: Request):
    full_path = f"/{path}"
    try:
        prefix, config = _match_route(full_path)
    except ValueError:
        return JSONResponse(status_code=404, content={"code": "NOT_FOUND", "message": f"No route for {full_path}"})
    claims = _enforce_auth(request, config)
    if isinstance(claims, JSONResponse):
        return claims
    target_base = config["target"]
    remaining_path = full_path[len(API_PREFIX):]
    target_url = f"{target_base}{remaining_path}"
    query = request.url.query
    if claims:
        # Trust the token, not the client: force tenant to the token's tenant
        params = [(k, v) for k, v in parse_qsl(query, keep_blank_values=True) if k != "tenant_id"]
        params.append(("tenant_id", claims.get("tenant_id", "default")))
        query = urlencode(params)
    if query:
        target_url += f"?{query}"
    return await proxy_request(request.method, target_url, request, extra_headers={
        "x-user-id": claims.get("sub", ""),
        "x-user-roles": ",".join(claims.get("roles", []) or []),
    } if claims else None)

from typing import TypedDict
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx

router = APIRouter()


class RouteConfig(TypedDict):
    target: str
    rate_limit: int
    auth_required: bool
    scopes: list[str]


ROUTE_TABLE: dict[str, RouteConfig] = {
    "/api/v1/auth": {"target": "http://auth-service:8001", "rate_limit": 100, "auth_required": False, "scopes": []},
    "/api/v1/vehicles": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/drivers": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/maintenance": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin"]},
    "/api/v1/fleet": {"target": "http://fleet-service:8002", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/routes": {"target": "http://routing-service:8003", "rate_limit": 60, "auth_required": True, "scopes": ["admin"]},
    "/api/v1/stops": {"target": "http://routing-service:8003", "rate_limit": 60, "auth_required": True, "scopes": ["admin"]},
    "/api/v1/trips": {"target": "http://routing-service:8003", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/students": {"target": "http://student-service:8004", "rate_limit": 80, "auth_required": True, "scopes": ["admin", "teacher"]},
    "/api/v1/attendance": {"target": "http://student-service:8004", "rate_limit": 80, "auth_required": True, "scopes": ["admin", "teacher", "driver"]},
    "/api/v1/ridership": {"target": "http://student-service:8004", "rate_limit": 80, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/gps": {"target": "http://geo-service:8005", "rate_limit": 120, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/geo": {"target": "http://geo-service:8005", "rate_limit": 120, "auth_required": True, "scopes": ["admin", "driver"]},
    "/api/v1/tenants": {"target": "http://tenant-service:8006", "rate_limit": 20, "auth_required": True, "scopes": ["superadmin"]},
    "/api/v1/notifications": {"target": "http://notification-service:8008", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "teacher", "driver"]},
    "/api/v1/alerts": {"target": "http://notification-service:8008", "rate_limit": 60, "auth_required": True, "scopes": ["admin", "teacher", "driver"]},
    "/api/v1/ai": {"target": "http://ai-service:8009", "rate_limit": 30, "auth_required": True, "scopes": ["admin", "parent"]},
    "/api/v1/reports": {"target": "http://fleet-service:8002", "rate_limit": 30, "auth_required": True, "scopes": ["admin"]},
    "/api/v1/analytics": {"target": "http://fleet-service:8002", "rate_limit": 30, "auth_required": True, "scopes": ["admin"]},
}


def _match_route(path: str) -> tuple[str, RouteConfig]:
    for prefix, config in sorted(ROUTE_TABLE.items(), key=lambda x: -len(x[0])):
        if path.startswith(prefix):
            return prefix, config
    raise ValueError(f"No route configured for {path}")


API_PREFIX = "/api/v1"


async def proxy_request(method: str, target_url: str, request: Request) -> JSONResponse:
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    body = await request.body()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, target_url, headers=headers, content=body)
    content = resp.json() if resp.content else {}
    return JSONResponse(content=content, status_code=resp.status_code, headers=dict(resp.headers))


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway_proxy(path: str, request: Request):
    full_path = f"/{path}"
    try:
        _match_route(full_path)
    except ValueError:
        return JSONResponse(status_code=404, content={"code": "NOT_FOUND", "message": f"No route for {full_path}"})
    prefix, config = _match_route(full_path)
    target_base = config["target"]
    remaining_path = full_path[len(API_PREFIX):]
    target_url = f"{target_base}{remaining_path}"
    if request.query_string:
        target_url += f"?{request.query_string.decode()}"
    return await proxy_request(request.method, target_url, request)

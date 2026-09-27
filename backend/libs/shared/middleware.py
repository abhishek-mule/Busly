import time
import uuid
import logging
from typing import Callable, Awaitable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("busly")


class TenantContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        tenant_id = request.headers.get("X-Tenant-ID") or request.headers.get("X-Forwarded-Host", "").split(".")[0]
        request.state.tenant_id = tenant_id
        response = await call_next(request)
        if tenant_id:
            response.headers["X-Tenant-ID"] = tenant_id
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed = time.monotonic() - start
        response.headers["X-Request-Time-Ms"] = str(round(elapsed * 1000, 2))
        logger.info("request_timing", extra={
            "method": request.method,
            "path": request.url.path,
            "elapsed_ms": round(elapsed * 1000, 2),
            "status_code": response.status_code,
            "tenant_id": getattr(request.state, "tenant_id", None),
            "request_id": getattr(request.state, "request_id", None),
        })
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        extra = {
            "request_id": getattr(request.state, "request_id", None),
            "tenant_id": getattr(request.state, "tenant_id", None),
            "method": request.method,
            "path": request.url.path,
        }
        logger.info("request_start", extra=extra)
        response = await call_next(request)
        logger.info("request_end", extra={**extra, "status_code": response.status_code})
        return response


def register_middlewares(app: ASGIApp) -> None:
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(TenantContextMiddleware)
    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(StructuredLoggingMiddleware)

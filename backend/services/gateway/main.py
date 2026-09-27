from contextlib import asynccontextmanager
from fastapi import FastAPI
from prometheus_client import make_asgi_app

from backend.services.gateway.routes import router
from backend.libs.shared.middleware import register_middlewares


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Busly API Gateway", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())
app.include_router(router)
register_middlewares(app)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway", "version": "1.0.0"}

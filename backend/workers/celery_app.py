import os

from celery import Celery
from kombu import Queue


def _redis_url(url: str) -> str:
    # Celery 5.x + kombu reject bare rediss:// URLs: they require an
    # explicit ?ssl_cert_reqs=... parameter (Upstash and other managed
    # Redis use valid certs, so CERT_REQUIRED is correct). Auto-append it
    # so platform env vars work verbatim. Plain redis:// is untouched.
    if url.startswith("rediss://") and "ssl_cert_reqs" not in url:
        sep = "&" if "?" in url else "?"
        return f"{url}{sep}ssl_cert_reqs=CERT_REQUIRED"
    return url


celery_app = Celery(
    "busly",
    broker=_redis_url(os.environ.get("BROKER_URL", "amqp://guest:guest@localhost:5672/")),
    backend=_redis_url(os.environ.get("RESULT_BACKEND", "redis://localhost:6379/0")),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_queue="default",
    task_queues=[
        Queue("default"),
        Queue("optimization"),
        Queue("reports"),
        Queue("notifications"),
        Queue("sync"),
    ],
    task_routes={
        "backend.workers.tasks.route_optimizer.*": {"queue": "optimization"},
        "backend.workers.tasks.report_generator.*": {"queue": "reports"},
        "backend.workers.tasks.notification_sender.*": {"queue": "notifications"},
        "backend.workers.tasks.sync_processor.*": {"queue": "sync"},
    },
)

from backend.workers.tasks import (  # noqa: E402,F401
    notification_sender,
    report_generator,
    route_optimizer,
    sync_processor,
)

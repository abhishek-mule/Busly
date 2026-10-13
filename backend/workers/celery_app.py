import os

from celery import Celery
from kombu import Queue


def _redis_url(url: str) -> str:
    # Celery 5.x + kombu reject bare rediss:// URLs: they require an
    # explicit ?ssl_cert_reqs=... parameter (Upstash and other managed
    # Redis use valid certs, so CERT_REQUIRED is correct). Auto-append it
    # so platform env vars work verbatim. Plain redis:// is untouched.
    # Strip surrounding whitespace/quotes: dashboard copy-paste often adds
    # them, and they would otherwise silently break scheme detection.
    url = (url or "").strip().strip('"').strip("'").strip()
    if url.startswith("rediss://") and "ssl_cert_reqs" not in url:
        sep = "&" if "?" in url else "?"
        return f"{url}{sep}ssl_cert_reqs=CERT_REQUIRED"
    return url


print("busly celery_app loaded (rediss normalizer active)", flush=True)


def _safe_result_backend(url: str) -> str:
    """Validate the result backend without connecting. A honcho-managed
    container dies entirely if the worker crashes at startup, so a bad
    RESULT_BACKEND must degrade to disabled results, never raise."""
    url = _redis_url(url)
    try:
        from celery import Celery as _Celery
        _Celery("busly-probe", backend=url).backend.as_uri()
        return url
    except Exception as exc:
        print(f"busly: result backend unusable, task results disabled ({exc})", flush=True)
        return "disabled"


_RESULT_BACKEND = _safe_result_backend(os.environ.get("RESULT_BACKEND", "redis://localhost:6379/0"))

celery_app = Celery(
    "busly",
    broker=_redis_url(os.environ.get("BROKER_URL", "amqp://guest:guest@localhost:5672/")),
    backend=_RESULT_BACKEND,
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

if _RESULT_BACKEND == "disabled":
    # No result store: don't try to persist STARTED states either.
    celery_app.conf.task_track_started = False

from backend.workers.tasks import (  # noqa: E402,F401
    notification_sender,
    report_generator,
    route_optimizer,
    sync_processor,
)

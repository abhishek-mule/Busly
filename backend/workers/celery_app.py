from celery import Celery

celery_app = Celery(
    "busly",
    broker="amqp://guest:guest@localhost:5672/",
    backend="redis://localhost:6379/0",
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
    task_routes={
        "backend.workers.tasks.route_optimizer.*": {"queue": "optimization"},
        "backend.workers.tasks.report_generator.*": {"queue": "reports"},
        "backend.workers.tasks.notification_sender.*": {"queue": "notifications"},
        "backend.workers.tasks.sync_processor.*": {"queue": "sync"},
    },
)

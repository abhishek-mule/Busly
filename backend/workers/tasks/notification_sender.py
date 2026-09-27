import logging
from typing import Optional

from backend.workers.celery_app import celery_app

logger = logging.getLogger("busly.workers.notification_sender")


@celery_app.task(queue="notifications", bind=True, max_retries=3)
def send_push_notification(self, user_id: str, tenant_id: str, title: str, body: str) -> dict:
    logger.info("sending_push", extra={"user_id": user_id, "tenant_id": tenant_id, "title": title})
    try:
        fcm_token = _get_fcm_token(user_id, tenant_id)
        if not fcm_token:
            logger.warning("no_fcm_token", extra={"user_id": user_id})
            return {"status": "skipped", "reason": "no_token"}
        _send_fcm_message(fcm_token, title, body)
        return {"status": "sent", "user_id": user_id}
    except Exception as exc:
        logger.error("push_failed", extra={"user_id": user_id, "error": str(exc)})
        raise self.retry(exc=exc)


@celery_app.task(queue="notifications", bind=True, max_retries=3)
def send_email(self, to: str, subject: str, template: str, context: dict) -> dict:
    logger.info("sending_email", extra={"to": to, "subject": subject, "template": template})
    try:
        rendered = _render_template(template, context)
        _send_smtp(to, subject, rendered)
        return {"status": "sent", "to": to}
    except Exception as exc:
        logger.error("email_failed", extra={"to": to, "error": str(exc)})
        raise self.retry(exc=exc)


def _get_fcm_token(user_id: str, tenant_id: str) -> Optional[str]:
    return None


def _send_fcm_message(token: str, title: str, body: str) -> None:
    pass


def _render_template(template: str, context: dict) -> str:
    return template


def _send_smtp(to: str, subject: str, body: str) -> None:
    pass

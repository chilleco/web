"""
Tasks responsible for model event jobs.

Model `.save()` calls enqueue events which are executed here by workers.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from lib import log
from lib.queue import queue as make_queue
from tasks.broker import broker
from tasks.event_enqueue import FALLBACK_QUEUE
from tasks.scheduler import redis_source


MAX_EVENT_ATTEMPTS = 5
BASE_DELAY_SECONDS = 30
MAX_DELAY_SECONDS = 60 * 30
RETRY_BATCH_SIZE = 100
MAX_ENQUEUE_RETRIES = 5


@broker.task
async def process_model_event(event: Dict[str, Any]) -> None:
    """
    Execute handlers for a single model-change event.

    Event shape (dict):
    - id: str (idempotency key)
    - model: str (collection name, e.g. "users")
    - entity_id: int
    - updated: int (entity updated timestamp after save)
    - field: str
    - old: Any
    - new: Any
    """

    from tasks.event_dispatcher import dispatch_event  # lazy import to avoid cycles

    try:
        await dispatch_event(event)
    except Exception as exc:  # pylint: disable=broad-except
        attempt = int(event.get("attempt") or 0) + 1
        event["attempt"] = attempt
        log.error(
            "Model event processing failed: {}",
            {"event": event, "error": str(exc), "attempt": attempt},
        )
        if attempt <= MAX_EVENT_ATTEMPTS:
            delay = min(BASE_DELAY_SECONDS * (2 ** (attempt - 1)), MAX_DELAY_SECONDS)
            next_run = datetime.now(tz=timezone.utc) + timedelta(seconds=delay)
            try:
                await process_model_event.schedule_by_time(redis_source, next_run, event)
                return
            except Exception as schedule_exc:  # pylint: disable=broad-except
                log.error(
                    "Model event retry schedule failed: {}",
                    {"event": event, "error": str(schedule_exc)},
                )
        raise


@broker.task(
    schedule=[
        {"cron": "*/1 * * * *"},
    ],
)
async def retry_model_events() -> None:
    """Re-enqueue events that failed to reach Taskiq."""

    pending = make_queue(FALLBACK_QUEUE)
    for _ in range(RETRY_BATCH_SIZE):
        payload = await pending.pop_nowait()
        if not payload:
            break

        if isinstance(payload, dict) and "event" in payload:
            event = payload["event"]
            enqueue_attempts = int(payload.get("enqueue_attempts") or 0) + 1
            payload["enqueue_attempts"] = enqueue_attempts
        else:
            event = payload
            enqueue_attempts = 1
            payload = {"event": event, "enqueue_attempts": enqueue_attempts}

        try:
            await process_model_event.kiq(event)
        except Exception as exc:  # pylint: disable=broad-except
            if enqueue_attempts <= MAX_ENQUEUE_RETRIES:
                try:
                    await pending.push(payload)
                except Exception as push_exc:  # pylint: disable=broad-except
                    log.error(
                        "Fallback queue requeue failed: {}",
                        {"event": event, "error": str(push_exc)},
                    )
            else:
                log.error(
                    "Model event enqueue retries exhausted: {}",
                    {"event": event, "error": str(exc)},
                )

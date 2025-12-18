"""
Tasks responsible for model callbacks.

Model `.save()` calls enqueue callback events which are executed here by workers.
"""

from __future__ import annotations

from typing import Any, Dict

from lib import log
from tasks.broker import broker


@broker.task
async def process_model_callback_event(event: Dict[str, Any]) -> None:
    """
    Execute callbacks for a single model-change event.

    Event shape (dict):
    - id: str (idempotency key)
    - model: str (collection name, e.g. "users")
    - entity_id: int
    - updated: int (entity updated timestamp after save)
    - field: str
    - old: Any
    - new: Any
    """

    from callbacks.dispatcher import dispatch_event  # lazy import to avoid cycles

    try:
        await dispatch_event(event)
    except Exception as exc:  # pylint: disable=broad-except
        log.error("Callback processing failed: {}", {"event": event, "error": str(exc)})
        raise


@broker.task(
    schedule=[
        # Process fallback callback queue frequently (API sync contexts, scripts, etc.).
        {"interval": 2},
    ],
)
async def drain_model_callback_queue(limit: int = 200) -> None:
    from callbacks.dispatcher import dispatch_event  # lazy import
    from callbacks.queue import pop

    for _ in range(int(limit)):
        event = pop()
        if not event:
            return
        await dispatch_event(event)

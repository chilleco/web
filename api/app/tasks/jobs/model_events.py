"""
Tasks responsible for model event jobs.

Model `.save()` calls enqueue events which are executed here by workers.
"""

from __future__ import annotations

from typing import Any, Dict

from lib import log
from tasks.broker import broker


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
        log.error("Model event processing failed: {}", {"event": event, "error": str(exc)})
        raise

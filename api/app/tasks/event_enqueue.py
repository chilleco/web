"""
Queue event jobs for background processing.

Prefer sending Taskiq tasks when an event loop is available; otherwise enqueue synchronously.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict

from lib import log
from lib.queue import queue as make_queue


FALLBACK_QUEUE = "model_events:pending"


async def _push_fallback(event: Dict[str, Any], reason: str | None = None) -> None:
    payload = {
        "event": event,
        "reason": reason,
        "queued_at": time.time(),
        "enqueue_attempts": int(event.get("enqueue_attempts") or 0),
    }
    try:
        await make_queue(FALLBACK_QUEUE).push(payload)
    except Exception as exc:  # pylint: disable=broad-except
        log.error(
            "Fallback queue push failed: {}",
            {"error": str(exc), "event": event},
        )


def enqueue(event: Dict[str, Any]) -> None:
    """
    Enqueue an event without blocking the caller.
    """

    event = dict(event)
    event.setdefault("attempt", 0)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    async def _send() -> None:
        from tasks import process_model_event

        try:
            await process_model_event.kiq(event)
        except Exception as exc:  # pylint: disable=broad-except
            log.error(
                "Taskiq enqueue failed: {}",
                {"error": str(exc), "event": event},
            )
            await _push_fallback(event, str(exc))

    if loop is not None:
        loop.create_task(_send())
        return

    try:
        asyncio.run(_send())
    except Exception:  # pylint: disable=broad-except
        # `.save()` should never crash because events cannot be enqueued.
        return

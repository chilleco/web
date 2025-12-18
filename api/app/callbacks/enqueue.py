"""
Queue callback events for background processing.

Prefer sending Taskiq tasks when an event loop is available; fall back to a Redis list.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict

from lib import log


def enqueue(event: Dict[str, Any]) -> None:
    """
    Enqueue a callback event without blocking the caller.
    """

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is None:
        from callbacks.queue import push

        push(event)
        return

    async def _send() -> None:
        from callbacks.queue import push
        from tasks.callbacks import process_model_callback_event

        try:
            await process_model_callback_event.kiq(event)
        except Exception as exc:  # pylint: disable=broad-except
            log.error(
                "Taskiq enqueue failed, fallback to queue: {}",
                {"error": str(exc), "event": event},
            )
            push(event)

    loop.create_task(_send())


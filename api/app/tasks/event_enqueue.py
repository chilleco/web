"""
Queue event jobs for background processing.

Prefer sending Taskiq tasks when an event loop is available; otherwise enqueue synchronously.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict

from lib import log


def enqueue(event: Dict[str, Any]) -> None:
    """
    Enqueue an event without blocking the caller.
    """

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
            raise

    if loop is not None:
        loop.create_task(_send())
        return

    try:
        asyncio.run(_send())
    except Exception:  # pylint: disable=broad-except
        # `.save()` should never crash because events cannot be enqueued.
        return

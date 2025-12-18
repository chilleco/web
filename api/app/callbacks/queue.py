"""
Fallback queue for callback events.

Used when `.save()` is called outside an async event loop or when broker enqueue fails.
"""

from __future__ import annotations

import pickle
from typing import Any, Dict

from libdev.cfg import cfg

from lib.queue import redis


QUEUE_KEY = f"{cfg('PROJECT_NAME') or 'app'}:callbacks:events"


def push(event: Dict[str, Any]) -> None:
    redis.rpush(QUEUE_KEY, pickle.dumps(event))


def pop() -> Dict[str, Any] | None:
    data = redis.lpop(QUEUE_KEY)
    if not data:
        return None
    return pickle.loads(data)


def length() -> int:
    try:
        return int(redis.llen(QUEUE_KEY))
    except Exception:  # pylint: disable=broad-except
        return 0


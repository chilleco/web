"""
Taskiq broker configuration.

This module is the single source of truth for background task execution:
- Async workers consume tasks from Redis (Taskiq broker).
- A separate Taskiq scheduler process enqueues scheduled tasks.
"""

from __future__ import annotations

from libdev.cfg import cfg

from taskiq_redis import ListQueueBroker


def redis_url(*, db: int) -> str:
    host = cfg("redis.host") or cfg("REDIS_HOST") or "mq"
    password = cfg("redis.pass") or cfg("REDIS_PASS")

    auth = f":{password}@" if password else ""
    return f"redis://{auth}{host}:6379/{db}"


broker = ListQueueBroker(
    redis_url(db=2),
    queue_name=f"{cfg('PROJECT_NAME') or 'app'}:taskiq",
)

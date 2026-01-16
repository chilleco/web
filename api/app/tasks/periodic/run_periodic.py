"""
Fixed-delay periodic tasks ("cycle after finish + N seconds").

Usage:
1) Trigger once from anywhere (API/webhook/script):
   `await run_periodic.kiq("cache_categories")`
2) After completion, the task schedules its next run via RedisScheduleSource.

This pattern guarantees a *fixed delay after finishing* (not fixed-rate).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict

from lib import log
from tasks.broker import broker
from tasks.scheduler import redis_source


PeriodicHandler = Callable[[], Any | Awaitable[Any]]


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


async def _cache_categories() -> None:
    from services.cache import cache_categories

    await cache_categories()


PERIODIC_JOBS: Dict[str, Dict[str, Any]] = {
    # Refresh category caches in Redis.
    "cache_categories": {
        "delay": 300,
        "handler": _cache_categories,
    },
}


@broker.task
async def run_periodic(job: str) -> None:
    job_cfg = PERIODIC_JOBS.get(job)
    if not job_cfg:
        log.error("Unknown periodic job: {}", job)
        return

    delay_seconds = int(job_cfg.get("delay") or 0)
    handler: PeriodicHandler = job_cfg["handler"]

    try:
        await _maybe_await(handler())
    except Exception as exc:  # pylint: disable=broad-except
        log.error("Periodic job failed: {}", {"job": job, "error": str(exc)})
    finally:
        if delay_seconds > 0:
            next_run = datetime.now(tz=timezone.utc) + timedelta(seconds=delay_seconds)
            await run_periodic.schedule_by_time(redis_source, next_run, job)

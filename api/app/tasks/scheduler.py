"""
Taskiq scheduler configuration.

Run with:
`taskiq scheduler tasks.scheduler:scheduler tasks`
"""

from __future__ import annotations

from libdev.cfg import cfg
from taskiq.schedule_sources import LabelScheduleSource
from taskiq.scheduler.scheduler import TaskiqScheduler
from taskiq_redis.schedule_source import RedisScheduleSource

from tasks.broker import broker, redis_url


label_source = LabelScheduleSource(broker)
redis_source = RedisScheduleSource(
    redis_url(db=2),
    prefix=f"{cfg('PROJECT_NAME') or 'app'}:taskiq:schedule",
)

# NOTE: order matters - static schedules from code + persistent schedules from Redis.
scheduler = TaskiqScheduler(
    broker=broker,
    sources=[
        label_source,
        redis_source,
    ],
)

__all__ = (
    "label_source",
    "redis_source",
    "scheduler",
)


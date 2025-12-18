"""
Small system/background tasks.
"""

from __future__ import annotations

from lib import log
from tasks.broker import broker


@broker.task(
    schedule=[
        # Every minute.
        {"cron": "* * * * *"},
    ],
)
async def ping() -> None:
    log.info("ping")

"""
The main functionality for the API
"""

import time
from functools import wraps

from consys.types import BaseType, validate
from libdev.cfg import cfg
from libdev.gen import generate, generate_id, generate_password
from libdev.log import log

from lib.reports import report


def handle_tasks(method):
    @wraps(method)
    async def inner(*args, **kwargs):
        now = time.time()
        log.info(f"Start {method.__name__}")
        try:
            return await method(*args, **kwargs)
        except Exception as e:  # pylint: disable=broad-exception-caught
            await report.critical(f"Task {method.__name__} failed: {e}", error=e)
        log.info(f"Finish {method.__name__}: {time.time() - now:.0f}s")

    return inner


__all__ = (
    "cfg",
    "log",
    "generate",
    "generate_id",
    "generate_password",
    "BaseType",
    "validate",
    "report",
    "handle_tasks",
)

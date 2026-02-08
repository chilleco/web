"""
The main functionality for the API
"""

import time
from functools import wraps

from consys.types import BaseType, validate
from libdev.cfg import cfg
from libdev.gen import generate, generate_id, generate_password

from services.logging import (
    clear_request_context,
    log,
    set_request_context,
    setup_logging,
)
from services.sentry import init_sentry, task_scope


setup_logging()
init_sentry()


def handle_tasks(method):
    @wraps(method)
    async def inner(*args, **kwargs):
        now = time.time()
        log.info("Start {}", method.__name__)
        with task_scope(method.__name__, args=args, kwargs=kwargs):
            try:
                return await method(*args, **kwargs)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                log.critical("Task {} failed: {}", method.__name__, str(exc))
            finally:
                log.info("Finish {}: {:.0f}s", method.__name__, time.time() - now)

    return inner


__all__ = (
    "cfg",
    "log",
    "generate",
    "generate_id",
    "generate_password",
    "BaseType",
    "validate",
    "clear_request_context",
    "set_request_context",
    "handle_tasks",
)

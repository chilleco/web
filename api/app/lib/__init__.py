"""
The main functionality for the API
"""

import time
from functools import wraps

from consys.types import BaseType, validate
import sentry_sdk
from libdev.cfg import cfg
from libdev.gen import generate, generate_id, generate_password
from libdev.log import log

from lib.reports import report


def handle_tasks(method):
    @wraps(method)
    async def inner(*args, **kwargs):
        now = time.time()
        log.info(f"Start {method.__name__}")
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("task", method.__name__)
            scope.set_extra(
                "task_args",
                {
                    "args": [repr(arg)[:500] for arg in args],
                    "kwargs": {key: repr(value)[:500] for key, value in kwargs.items()},
                },
            )
            with sentry_sdk.start_transaction(op="task", name=method.__name__):
                try:
                    return await method(*args, **kwargs)
                except Exception as e:  # pylint: disable=broad-exception-caught
                    await report.critical(f"Task {method.__name__} failed: {e}", error=e)
                finally:
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

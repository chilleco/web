"""
The main functionality for the API
"""

import time
from functools import wraps

from consys.types import BaseType, validate
from libdev.cfg import cfg
from libdev.gen import generate, generate_id, generate_password

from libdev.log import log, setup_logging, clear_request_context, set_request_context
from services.sentry import init_sentry, task_scope


setup_logging(
    notify_token=cfg("tg.token"),
    notify_chat=cfg("bug.chat"),
)
init_sentry()


def handle_tasks(method):
    @wraps(method)
    async def inner(*args, **kwargs):
        now = time.time()
        log.info(f"Start {method.__name__}")
        with task_scope(method.__name__, args=args, kwargs=kwargs):
            try:
                return await method(*args, **kwargs)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                log.critical(f"Task {method.__name__} failed: {exc}")
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
    "clear_request_context",
    "set_request_context",
    "handle_tasks",
)

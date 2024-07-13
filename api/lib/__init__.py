"""
The main functionality for the API
"""

from functools import wraps

from consys.types import BaseType, validate
from libdev.cfg import cfg
from libdev.gen import generate, generate_id, generate_password
from libdev.log import log

from lib.reports import report


def handle_errors(method):
    @wraps(method)
    async def inner(*args, **kwargs):
        try:
            return await method(*args, **kwargs)
        except Exception as e:
            await report.critical(f"Task failed: {e}", error=e)

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
    "handle_errors",
)

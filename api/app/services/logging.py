"""
JSON logging to stdout with request correlation.
"""

from __future__ import annotations

import contextvars
import json
import sys
from typing import Any

import sentry_sdk
from libdev.cfg import cfg
from libdev.log import log


_request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)
_trace_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "trace_id", default=None
)

_SERVICE = cfg("service") or "api"
_ENV = cfg("env", "test")
_VERSION = cfg("release") or "unknown"
_LEVEL = cfg("log.level") or "INFO"


def _current_trace_id() -> str | None:
    span = sentry_sdk.get_current_scope().span
    if span and getattr(span, "trace_id", None):
        return str(span.trace_id)
    return None


def set_request_context(request_id: str, trace_id: str | None = None) -> None:
    _request_id_var.set(request_id)
    _trace_id_var.set(trace_id)


def clear_request_context() -> None:
    _request_id_var.set(None)
    _trace_id_var.set(None)


def _inject_context(record: dict[str, Any]) -> dict[str, Any]:
    request_id = _request_id_var.get()
    trace_id = _trace_id_var.get() or _current_trace_id()
    if request_id:
        record["extra"]["request_id"] = request_id
    if trace_id:
        record["extra"]["trace_id"] = trace_id
    return record


def _serialize_exception(exception: Any | None) -> dict[str, Any]:
    if not exception:
        return {}
    stack = None
    if exception.traceback is not None:
        try:
            stack = "".join(exception.traceback.format())
        except Exception:  # pylint: disable=broad-except
            stack = str(exception.traceback)
    return {
        "type": getattr(exception.type, "__name__", None),
        "message": str(exception.value) if exception.value is not None else None,
        "stack": stack,
    }


def _json_sink(message) -> None:
    record = message.record
    exception = record.get("exception")
    error_payload = _serialize_exception(exception)

    output: dict[str, Any] = {
        "service": _SERVICE,
        "env": _ENV,
        "version": _VERSION,
        "level": record["level"].name,
        "trace_id": record["extra"].get("trace_id"),
        "request_id": record["extra"].get("request_id"),
        "msg": record["message"],
        "time": record["time"].isoformat(),
    }

    if error_payload.get("stack"):
        output["error.stack"] = error_payload["stack"]
    if error_payload.get("message"):
        output["error.message"] = error_payload["message"]
    if error_payload.get("type"):
        output["error.type"] = error_payload["type"]

    extra = {
        key: value
        for key, value in record["extra"].items()
        if key not in {"trace_id", "request_id"}
    }
    if extra:
        output["extra"] = extra

    sys.stdout.write(json.dumps(output, ensure_ascii=True) + "\n")


def setup_logging() -> None:
    log.remove()
    log.configure(patcher=_inject_context)
    log.add(_json_sink, level=_LEVEL, enqueue=True)

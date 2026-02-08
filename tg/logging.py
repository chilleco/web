"""
Unified Loguru observability for TG:
- JSON logs to stdout for Alloy -> Loki -> Grafana
- Sentry breadcrumbs/events from the same Loguru records
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

_SERVICE = cfg("service") or "tg"
_ENV = cfg("env", "test")
_VERSION = cfg("release") or "unknown"
_LEVEL = cfg("log.level") or "INFO"
_SKIP_SENTRY_CAPTURE_KEY = "_skip_sentry_capture"


def set_request_context(request_id: str, trace_id: str | None = None) -> None:
    _request_id_var.set(request_id)
    _trace_id_var.set(trace_id)


def clear_request_context() -> None:
    _request_id_var.set(None)
    _trace_id_var.set(None)


def _is_sentry_enabled() -> bool:
    try:
        client = sentry_sdk.get_client()
    except Exception:  # pylint: disable=broad-except
        return False
    if client is None:
        return False
    options = getattr(client, "options", None)
    return bool(options and options.get("dsn"))


def _to_sentry_level(level_name: str) -> str:
    mapping = {
        "TRACE": "debug",
        "DEBUG": "debug",
        "INFO": "info",
        "SUCCESS": "info",
        "WARNING": "warning",
        "ERROR": "error",
        "CRITICAL": "fatal",
    }
    return mapping.get(level_name.upper(), "info")


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return str(value)


def _current_trace_id() -> str | None:
    span = sentry_sdk.get_current_scope().span
    if span and getattr(span, "trace_id", None):
        return str(span.trace_id)
    return None


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
        key: _json_safe(value)
        for key, value in record["extra"].items()
        if key not in {"trace_id", "request_id", _SKIP_SENTRY_CAPTURE_KEY}
    }
    if extra:
        output["extra"] = extra

    sys.stdout.write(json.dumps(output, ensure_ascii=True) + "\n")


def _sentry_sink(message) -> None:
    if not _is_sentry_enabled():
        return

    record = message.record
    level_name = record["level"].name.upper()
    sentry_level = _to_sentry_level(level_name)

    extra = {
        key: _json_safe(value)
        for key, value in record["extra"].items()
        if key != _SKIP_SENTRY_CAPTURE_KEY
    }

    sentry_sdk.add_breadcrumb(
        category=f"{_SERVICE}.log",
        message=record["message"],
        level=sentry_level,
        data=extra or None,
    )

    if record["extra"].get(_SKIP_SENTRY_CAPTURE_KEY):
        return

    if level_name not in {"ERROR", "CRITICAL"}:
        return

    with sentry_sdk.push_scope() as scope:
        for key, value in extra.items():
            scope.set_extra(key, value)
        scope.set_tag("service", _SERVICE)

        exception = record.get("exception")
        if exception and exception.value is not None:
            sentry_sdk.capture_exception(exception.value)
        else:
            sentry_sdk.capture_message(record["message"], level=sentry_level)


def setup_logging() -> None:
    log.remove()
    log.configure(patcher=_inject_context)
    log.add(_json_sink, level=_LEVEL, enqueue=True, catch=True)
    # Keep Sentry sink synchronous so breadcrumbs/events stay on the active scope.
    log.add(_sentry_sink, level=_LEVEL, enqueue=False, catch=True)

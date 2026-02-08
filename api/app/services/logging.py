"""
Unified Loguru logging for API:
- JSON logs to stdout (Alloy -> Loki -> Grafana)
- Telegram notifications for important/silent=False events

Sentry integration is configured in `services/sentry.py`.
"""

from __future__ import annotations

import contextvars
import json
import sys
from typing import Any, Iterable
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from libdev.cfg import cfg
from loguru import logger


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

_NOTIFY_TOKEN = cfg("tg.token")
_NOTIFY_CHAT = cfg("bug.chat")
_INTERNAL_EXTRA_KEYS = {"_notify", "request_id", "trace_id"}


def _as_float(value: Any, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


_NOTIFY_TIMEOUT = _as_float(cfg("log.notify_timeout"), 3.0)


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return str(value)


def _normalize_tags(tags: dict[str, Any] | Iterable[str] | None) -> dict[str, str]:
    if not tags:
        return {}
    if isinstance(tags, dict):
        return {
            str(key): str(value)
            for key, value in tags.items()
            if key and value is not None
        }
    return {str(tag): "true" for tag in tags if tag}


def _has_active_exception() -> bool:
    return sys.exc_info()[0] is not None


def set_request_context(request_id: str, trace_id: str | None = None) -> None:
    _request_id_var.set(request_id)
    _trace_id_var.set(trace_id)


def clear_request_context() -> None:
    _request_id_var.set(None)
    _trace_id_var.set(None)


def _inject_context(record: dict[str, Any]) -> dict[str, Any]:
    request_id = _request_id_var.get()
    trace_id = _trace_id_var.get()
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
        if key not in _INTERNAL_EXTRA_KEYS
    }
    if extra:
        output["extra"] = extra

    sys.stdout.write(json.dumps(output, ensure_ascii=True) + "\n")


def _notify_enabled() -> bool:
    return bool(_NOTIFY_TOKEN and _NOTIFY_CHAT)


def _safe_json(value: Any) -> str:
    try:
        return json.dumps(_json_safe(value), ensure_ascii=False)
    except Exception:  # pylint: disable=broad-except
        return str(value)


def _build_notify_text(record: dict[str, Any], error_payload: dict[str, Any]) -> str:
    lines = [f"[{_SERVICE}/{_ENV}] {record['level'].name}: {record['message']}"]

    request_id = record["extra"].get("request_id")
    trace_id = record["extra"].get("trace_id")
    tags = record["extra"].get("tags")
    payload = record["extra"].get("payload")

    if request_id:
        lines.append(f"request_id: {request_id}")
    if trace_id:
        lines.append(f"trace_id: {trace_id}")
    if tags:
        lines.append(f"tags: {_safe_json(tags)}")
    if payload is not None:
        lines.append(f"payload: {_safe_json(payload)}")
    if error_payload.get("message"):
        lines.append(f"error: {error_payload['message']}")

    text = "\n".join(lines)
    if len(text) > 3800:
        return text[:3797] + "..."
    return text


def _send_notify(text: str) -> None:
    if not _notify_enabled():
        return
    data = urllib_parse.urlencode(
        {
            "chat_id": str(_NOTIFY_CHAT),
            "text": text,
            "disable_web_page_preview": "true",
        }
    ).encode("utf-8")
    req = urllib_request.Request(
        f"https://api.telegram.org/bot{_NOTIFY_TOKEN}/sendMessage",
        data=data,
        method="POST",
    )
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib_request.urlopen(req, timeout=_NOTIFY_TIMEOUT):
            return
    except Exception as exc:  # pylint: disable=broad-except
        sys.stderr.write(
            f'{{"service":"{_SERVICE}","level":"ERROR","msg":"notify failed","error":"{str(exc)}"}}\n'
        )


def _notify_sink(message) -> None:
    record = message.record
    if not record["extra"].get("_notify"):
        return
    error_payload = _serialize_exception(record.get("exception"))
    _send_notify(_build_notify_text(record, error_payload))


class AppLogger:
    """Project logger wrapper around Loguru with notify controls."""

    def __init__(self, raw_logger):
        self._logger = raw_logger

    def catch(self, *args, **kwargs):
        return self._logger.catch(*args, **kwargs)

    def bind(self, **kwargs):
        return self._logger.bind(**kwargs)

    def _fallback(self, level: str, message: Any, exc: Exception) -> None:
        try:
            payload = {
                "service": _SERVICE,
                "env": _ENV,
                "version": _VERSION,
                "level": "ERROR",
                "msg": "logger emit failed",
                "log_level": level.upper(),
                "log_message": str(message),
                "error": str(exc),
            }
            sys.stderr.write(json.dumps(payload, ensure_ascii=True) + "\n")
        except Exception:  # pylint: disable=broad-except
            return

    def _extract_payload(
        self, message: Any, args: tuple[Any, ...], extra: Any | None
    ) -> tuple[tuple[Any, ...], Any | None]:
        if extra is not None:
            return args, extra
        if (
            len(args) == 1
            and isinstance(args[0], (dict, list, tuple, set))
            and isinstance(message, str)
            and "{" not in message
        ):
            return tuple(), args[0]
        return args, None

    def _emit(
        self,
        level: str,
        message: Any,
        *args: Any,
        tags: dict[str, Any] | Iterable[str] | None = None,
        silent: bool = True,
        extra: Any | None = None,
    ) -> None:
        fmt_args, payload = self._extract_payload(message, args, extra)
        context: dict[str, Any] = {}
        normalized_tags = _normalize_tags(tags)
        if normalized_tags:
            context["tags"] = normalized_tags
        if payload is not None:
            context["payload"] = _json_safe(payload)
        if not silent:
            context["_notify"] = True

        target = self._logger.bind(**context) if context else self._logger
        try:
            if _has_active_exception():
                target.opt(exception=True).log(level.upper(), message, *fmt_args)
            else:
                target.log(level.upper(), message, *fmt_args)
        except Exception as exc:  # pylint: disable=broad-except
            self._fallback(level, message, exc)

    def log(
        self,
        level: str,
        message: Any,
        *args: Any,
        tags: dict[str, Any] | Iterable[str] | None = None,
        silent: bool = True,
        extra: Any | None = None,
    ) -> None:
        self._emit(
            level,
            message,
            *args,
            tags=tags,
            silent=silent,
            extra=extra,
        )

    def trace(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("TRACE", message, *args, **kwargs)

    def debug(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("DEBUG", message, *args, **kwargs)

    def info(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("INFO", message, *args, **kwargs)

    def success(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("SUCCESS", message, *args, **kwargs)

    def warning(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("WARNING", message, *args, **kwargs)

    def error(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("ERROR", message, *args, **kwargs)

    def critical(self, message: Any, *args: Any, **kwargs) -> None:
        self._emit("CRITICAL", message, *args, **kwargs)

    def exception(
        self,
        message: Any,
        *args: Any,
        tags: dict[str, Any] | Iterable[str] | None = None,
        silent: bool = True,
        extra: Any | None = None,
    ) -> None:
        fmt_args, payload = self._extract_payload(message, args, extra)
        context: dict[str, Any] = {}
        normalized_tags = _normalize_tags(tags)
        if normalized_tags:
            context["tags"] = normalized_tags
        if payload is not None:
            context["payload"] = _json_safe(payload)
        if not silent:
            context["_notify"] = True

        target = self._logger.bind(**context) if context else self._logger
        try:
            target.opt(exception=True).error(message, *fmt_args)
        except Exception as exc:  # pylint: disable=broad-except
            self._fallback("ERROR", message, exc)

    def important(
        self,
        message: Any,
        *args: Any,
        tags: dict[str, Any] | Iterable[str] | None = None,
        silent: bool = False,
        extra: Any | None = None,
    ) -> None:
        merged_tags = _normalize_tags(tags)
        merged_tags["important"] = "true"
        self._emit(
            "INFO",
            message,
            *args,
            tags=merged_tags,
            silent=silent,
            extra=extra,
        )


log = AppLogger(logger)


def add_external_sink(
    sink: Any,
    *,
    level: str | None = None,
    enqueue: bool = False,
    catch: bool = True,
) -> int:
    return logger.add(sink, level=level or _LEVEL, enqueue=enqueue, catch=catch)


def setup_logging() -> None:
    logger.remove()
    logger.configure(patcher=_inject_context)
    logger.add(_json_sink, level=_LEVEL, enqueue=True, catch=True)
    logger.add(_notify_sink, level=_LEVEL, enqueue=True, catch=True)


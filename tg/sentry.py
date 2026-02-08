"""
Sentry initialization for TG bot.
"""

from __future__ import annotations

import json
import sys
from typing import Any, Iterable

import sentry_sdk
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from libdev.cfg import cfg
from tg.logging import add_external_sink


_SENTRY_SINK_ID: int | None = None


def _as_bool(value: Any, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return default


def _as_float(value: Any, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _default_sample_rate(env: str) -> float:
    if env in {"local", "test", "dev"}:
        return 1.0
    return 0.2


def _build_integrations() -> list[Any]:
    return [
        FastApiIntegration(),
        StarletteIntegration(),
        AsyncioIntegration(),
    ]


def _safe_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _safe_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_safe_value(item) for item in value]
    return str(value)


def _stderr_fallback(message: str, exc: Exception) -> None:
    try:
        payload = {
            "service": cfg("service") or "tg",
            "env": cfg("env", "test"),
            "level": "ERROR",
            "msg": message,
            "error": str(exc),
        }
        sys.stderr.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception:  # pylint: disable=broad-except
        return


def _to_sentry_level(level_name: str) -> str:
    normalized = level_name.upper()
    if normalized in {"TRACE", "DEBUG"}:
        return "debug"
    if normalized in {"INFO", "SUCCESS"}:
        return "info"
    if normalized == "WARNING":
        return "warning"
    if normalized == "CRITICAL":
        return "fatal"
    return "error"


def _apply_log_scope(record: dict[str, Any]) -> None:
    scope = sentry_sdk.get_current_scope()
    extra = record.get("extra") or {}

    scope.set_tag("log_level", record["level"].name)

    request_id = extra.get("request_id")
    trace_id = extra.get("trace_id")
    if request_id:
        scope.set_tag("request_id", str(request_id))
    if trace_id:
        scope.set_tag("trace_id", str(trace_id))

    tags = extra.get("tags")
    if isinstance(tags, dict):
        for key, value in tags.items():
            if key and value is not None:
                scope.set_tag(str(key), str(value))
    elif isinstance(tags, (list, tuple, set)):
        for tag in tags:
            if tag:
                scope.set_tag(str(tag), "true")

    payload = extra.get("payload")
    if payload is not None:
        scope.set_extra("payload", _safe_value(payload))

    scope.set_extra(
        "logger",
        {
            "message": record.get("message"),
            "time": record["time"].isoformat(),
        },
    )


def _sentry_sink(message) -> None:
    record = message.record
    try:
        with sentry_sdk.push_scope():
            _apply_log_scope(record)
            exception = record.get("exception")
            if exception and exception.value is not None:
                sentry_sdk.capture_exception(exception.value)
                return
            sentry_sdk.capture_message(
                record["message"],
                level=_to_sentry_level(record["level"].name),
            )
    except Exception as exc:  # pylint: disable=broad-except
        _stderr_fallback("sentry sink failed", exc)


def init_sentry() -> bool:
    if not cfg("sentry.dsn"):
        return False

    env = cfg("env", "test")
    service = cfg("service") or "tg"
    traces_sample_rate = _as_float(
        cfg("sentry.traces_sample_rate"), _default_sample_rate(env)
    )
    profiles_sample_rate = _as_float(
        cfg("sentry.profiles_sample_rate"), traces_sample_rate
    )
    send_default_pii = _as_bool(cfg("sentry.send_default_pii"), True)

    sentry_sdk.init(
        dsn=cfg("sentry.dsn"),
        environment=env,
        release=cfg("release"),
        server_name=service,
        integrations=_build_integrations(),
        traces_sample_rate=traces_sample_rate,
        profiles_sample_rate=profiles_sample_rate if traces_sample_rate > 0 else 0.0,
        send_default_pii=send_default_pii,
        max_request_body_size="always",
        attach_stacktrace=True,
        with_locals=True,
        max_value_length=4096,
        in_app_include=[
            "tg",
        ],
    )
    sentry_sdk.set_tag("service", service)

    global _SENTRY_SINK_ID
    if _SENTRY_SINK_ID is None:
        _SENTRY_SINK_ID = add_external_sink(
            _sentry_sink,
            level="ERROR",
            enqueue=True,
            catch=True,
        )

    return True


def set_request_context(request_id: str, trace_id: str | None = None) -> None:
    sentry_sdk.set_extra("request_id", request_id)
    if trace_id:
        sentry_sdk.set_extra("trace_id", trace_id)


def add_tags(tags: dict[str, str] | Iterable[str] | None) -> None:
    if not tags:
        return
    scope = sentry_sdk.get_current_scope()
    if isinstance(tags, dict):
        for key, value in tags.items():
            if value is not None:
                scope.set_tag(key, str(value))
        return
    for tag in tags:
        scope.set_tag(str(tag), "true")


def flush_sentry(timeout: float = 2.0) -> None:
    try:
        sentry_sdk.flush(timeout=timeout)
    except Exception as exc:  # pylint: disable=broad-except
        _stderr_fallback("sentry flush failed", exc)

"""
Sentry initialization and helpers.
"""

from __future__ import annotations

from typing import Any, Iterable

import logging
import sentry_sdk
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from libdev.cfg import cfg
from libdev.log import log


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
        RedisIntegration(),
        LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
    ]


def init_sentry() -> bool:
    if not cfg("sentry.dsn"):
        log.info("Sentry disabled: missing DSN")
        return False

    env = cfg("env") or "test"
    service = cfg("service") or "api"
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
            "routes",
            "services",
            "models",
            "tasks",
            "lib",
        ],
    )
    sentry_sdk.set_tag("service", service)

    log.info(
        "Sentry enabled",
        {
            "env": env,
            "traces_sample_rate": traces_sample_rate,
            "profiles_sample_rate": profiles_sample_rate,
        },
    )
    return True


def add_span_data(data: dict[str, Any] | None) -> None:
    if not data:
        return
    scope = sentry_sdk.get_current_scope()
    span = scope.span
    if span is None:
        return
    for key, value in data.items():
        if value is not None:
            span.set_data(key, value)


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
        log.warning("Sentry flush failed: {}", str(exc))

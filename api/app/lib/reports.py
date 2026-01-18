"""
Sentry-backed reporting helpers.
"""

from __future__ import annotations

from typing import Any, Iterable

import sentry_sdk

from libdev.cfg import cfg
from libdev.log import log


def _normalize_extra(extra: Any) -> dict[str, Any]:
    if extra is None:
        return {}
    if isinstance(extra, dict):
        return {key: value for key, value in extra.items() if value is not None}
    return {"extra": extra}


def _apply_tags(
    scope: sentry_sdk.Scope, tags: dict[str, str] | Iterable[str] | None
) -> None:
    if not tags:
        return
    if isinstance(tags, dict):
        for key, value in tags.items():
            if value is not None:
                scope.set_tag(key, str(value))
        return
    for tag in tags:
        scope.set_tag(str(tag), "true")


class SentryReport:
    """Sentry"""

    def __init__(self, env: str):
        self.env = env

    def _log(self, level: str, text: str, extra: Any | None) -> None:
        payload = _normalize_extra(extra)
        if payload:
            log.log(level.upper(), "{} | {}", text, payload)
        else:
            log.log(level.upper(), "{}", text)

    def _capture(
        self,
        *,
        level: str,
        text: str,
        extra: Any | None,
        tags: dict[str, str] | Iterable[str] | None,
        error: Exception | None,
    ) -> None:
        data = _normalize_extra(extra)
        with sentry_sdk.push_scope() as scope:
            for key, value in data.items():
                scope.set_extra(key, value)
            _apply_tags(scope, tags)
            if error:
                scope.set_extra("message", text)
                sentry_sdk.capture_exception(error)
            else:
                sentry_sdk.capture_message(text, level=level)

    async def debug(self, text: str, extra: Any | None = None) -> None:
        self._log("debug", text, extra)
        sentry_sdk.add_breadcrumb(
            message=text, level="debug", data=_normalize_extra(extra)
        )

    async def info(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
    ) -> None:
        self._log("info", text, extra)
        if not silent:
            self._capture(level="info", text=text, extra=extra, tags=tags, error=None)

    async def warning(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
        error: Exception | None = None,
    ) -> None:
        self._log("warning", text, extra)
        if not silent:
            self._capture(
                level="warning", text=text, extra=extra, tags=tags, error=error
            )

    async def error(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
        error: Exception | None = None,
    ) -> None:
        self._log("error", text, extra)
        if not silent:
            self._capture(level="error", text=text, extra=extra, tags=tags, error=error)

    async def critical(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
        error: Exception | None = None,
    ) -> None:
        self._log("critical", text, extra)
        if not silent:
            self._capture(level="fatal", text=text, extra=extra, tags=tags, error=error)

    async def important(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
    ) -> None:
        if isinstance(tags, dict):
            combined_tags: dict[str, str] | Iterable[str] = dict(tags)
            combined_tags["important"] = "true"
        else:
            combined_tags = ["important"]
            if tags:
                combined_tags = list(combined_tags) + list(tags)
        self._log("info", text, extra)
        if not silent:
            self._capture(
                level="info", text=text, extra=extra, tags=combined_tags, error=None
            )

    async def request(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
    ) -> None:
        if isinstance(tags, dict):
            combined_tags: dict[str, str] | Iterable[str] = dict(tags)
            combined_tags["request"] = "true"
        else:
            combined_tags = ["request"]
            if tags:
                combined_tags = list(combined_tags) + list(tags)
        self._log("info", text, extra)
        if not silent:
            self._capture(
                level="info", text=text, extra=extra, tags=combined_tags, error=None
            )


report = SentryReport(str(cfg("env") or "test"))

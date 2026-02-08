"""
Compatibility notification/report facade built on top of the common logger.
"""

from __future__ import annotations

from typing import Any, Iterable

from services.logging import log


def _merge_tags(
    tags: dict[str, str] | Iterable[str] | None, extra_tag: str
) -> dict[str, str] | Iterable[str]:
    if isinstance(tags, dict):
        merged = dict(tags)
        merged[extra_tag] = "true"
        return merged
    merged_list: list[str] = [extra_tag]
    if tags:
        merged_list.extend([str(tag) for tag in tags])
    return merged_list


class NotifyReport:
    """Async facade preserved for legacy `report.*` call sites."""

    async def debug(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = True,
        error: Exception | None = None,
    ) -> None:
        log.debug(text, extra=extra, tags=tags, silent=silent, error=error)

    async def info(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = True,
        error: Exception | None = None,
    ) -> None:
        log.info(text, extra=extra, tags=tags, silent=silent, error=error)

    async def warning(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = True,
        error: Exception | None = None,
    ) -> None:
        log.warning(text, extra=extra, tags=tags, silent=silent, error=error)

    async def error(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = True,
        error: Exception | None = None,
    ) -> None:
        log.error(text, extra=extra, tags=tags, silent=silent, error=error)

    async def critical(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = True,
        error: Exception | None = None,
    ) -> None:
        log.critical(text, extra=extra, tags=tags, silent=silent, error=error)

    async def important(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = False,
        error: Exception | None = None,
    ) -> None:
        log.important(text, extra=extra, tags=tags, silent=silent, error=error)

    async def request(
        self,
        text: str,
        extra: Any | None = None,
        tags: dict[str, str] | Iterable[str] | None = None,
        silent: bool = True,
        error: Exception | None = None,
    ) -> None:
        log.info(
            text,
            extra=extra,
            tags=_merge_tags(tags, "request"),
            silent=silent,
            error=error,
        )


report = NotifyReport()
notify = report


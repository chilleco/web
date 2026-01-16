"""
Event dispatcher.

Executed by Taskiq workers.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict, Type

from tasks.event_registry import get_handlers
from lib import log
from lib.queue import redis
from models import Base


LOCK_TTL_SECONDS = 60 * 5
DONE_TTL_SECONDS = 60 * 60 * 24 * 7


def _event_key(prefix: str, event_id: str) -> str:
    return f"event:{prefix}:{event_id}"


async def _is_done(event_id: str) -> bool:
    if not event_id:
        return False
    try:
        return bool(await redis.get(_event_key("done", event_id)))
    except Exception:  # pylint: disable=broad-except
        return False


async def _acquire_lock(event_id: str) -> bool:
    if not event_id:
        return True
    try:
        return bool(
            await redis.set(
                _event_key("lock", event_id),
                1,
                nx=True,
                ex=LOCK_TTL_SECONDS,
            )
        )
    except Exception:  # pylint: disable=broad-except
        return True


async def _mark_done(event_id: str) -> None:
    if not event_id:
        return
    try:
        await redis.set(_event_key("done", event_id), 1, ex=DONE_TTL_SECONDS)
    except Exception:  # pylint: disable=broad-except
        return


async def _release_lock(event_id: str) -> None:
    if not event_id:
        return
    try:
        await redis.delete(_event_key("lock", event_id))
    except Exception:  # pylint: disable=broad-except
        return


@lru_cache(maxsize=1)
def _model_map() -> Dict[str, Type[Base]]:
    """
    Build a mapping from collection name (`_name`) -> model class.
    """

    import importlib
    import pkgutil

    import models

    mapping: Dict[str, Type[Base]] = {}
    for module_info in pkgutil.iter_modules(models.__path__):
        module = importlib.import_module(f"models.{module_info.name}")
        for obj in module.__dict__.values():
            if not isinstance(obj, type):
                continue
            if not issubclass(obj, Base):
                continue
            model_name = getattr(obj, "_name", None)
            if isinstance(model_name, str) and model_name:
                mapping[model_name] = obj

    return mapping


def _get_model_cls(model_name: str) -> Type[Base] | None:
    return _model_map().get(model_name)


async def dispatch_event(event: Dict[str, Any]) -> None:
    event_id = str(event.get("id") or "")
    if event_id and await _is_done(event_id):
        return
    if not await _acquire_lock(event_id):
        return

    try:
        model_name = str(event.get("model") or "")
        entity_id = event.get("entity_id")
        field = str(event.get("field") or "")

        model_cls = _get_model_cls(model_name)
        if not model_cls or not entity_id or not field:
            log.error("Invalid event: {}", event)
            await _mark_done(event_id)
            return

        handlers = get_handlers(model=model_name, field=field)
        if not handlers:
            await _mark_done(event_id)
            return

        entity = model_cls.get(int(entity_id))
        if not entity:
            await _mark_done(event_id)
            return

        for handler_cls in handlers:
            handler = handler_cls(
                entity,
                field,
                event.get("old"),
                event.get("new"),
                updated=event.get("updated"),
                event_id=event_id,
            )
            await handler.execute()

        await _mark_done(event_id)
    finally:
        await _release_lock(event_id)

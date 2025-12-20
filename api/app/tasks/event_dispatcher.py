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


def _claim_event(event_id: str, *, ttl_seconds: int = 60 * 60 * 24 * 7) -> bool:
    """
    Best-effort idempotency guard.

    Uses Redis SET NX to prevent double execution of the same event.
    """

    if not event_id:
        return True

    key = f"event:done:{event_id}"
    try:
        return bool(redis.set(key, 1, nx=True, ex=ttl_seconds))
    except Exception:  # pylint: disable=broad-except
        return True


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
    if not _claim_event(event_id):
        return

    model_name = str(event.get("model") or "")
    entity_id = event.get("entity_id")
    field = str(event.get("field") or "")

    model_cls = _get_model_cls(model_name)
    if not model_cls or not entity_id or not field:
        log.error("Invalid event: {}", event)
        return

    handlers = get_handlers(model=model_name, field=field)
    if not handlers:
        return

    entity = model_cls.get(int(entity_id))

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

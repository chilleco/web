"""
Event registry.

Handlers are registered by model collection name and field name.
"""

from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, List, Type

from tasks.event_base import EventHandler


_REGISTRY: DefaultDict[str, DefaultDict[str, List[Type[EventHandler]]]] = defaultdict(
    lambda: defaultdict(list)
)


def on_change(*, model: str, field: str):
    """
    Register a handler class for `model` + `field` changes.
    """

    def decorator(handler_cls: Type[EventHandler]) -> Type[EventHandler]:
        _REGISTRY[model][field].append(handler_cls)
        return handler_cls

    return decorator


def get_handlers(*, model: str, field: str) -> List[Type[EventHandler]]:
    return list(_REGISTRY.get(model, {}).get(field, []))


def has_handlers(*, model: str, field: str) -> bool:
    return bool(_REGISTRY.get(model, {}).get(field))


# NOTE: import event modules to register decorators.
from tasks.events import bonus as _bonus  # noqa: E402,F401

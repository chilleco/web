"""
Callback registry.

Callbacks are registered by model collection name and field name.
"""

from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, List, Type

from callbacks.base import Callback


_REGISTRY: DefaultDict[str, DefaultDict[str, List[Type[Callback]]]] = defaultdict(
    lambda: defaultdict(list)
)


def on_change(*, model: str, field: str):
    """
    Register a callback class for `model` + `field` changes.
    """

    def decorator(callback_cls: Type[Callback]) -> Type[Callback]:
        _REGISTRY[model][field].append(callback_cls)
        return callback_cls

    return decorator


def get_callbacks(*, model: str, field: str) -> List[Type[Callback]]:
    return list(_REGISTRY.get(model, {}).get(field, []))


def has_callbacks(*, model: str, field: str) -> bool:
    return bool(_REGISTRY.get(model, {}).get(field))


# NOTE: import callback modules to register decorators.
from callbacks import bonus as _bonus  # noqa: E402,F401


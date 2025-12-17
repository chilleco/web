from enum import Enum
from typing import Any, Dict

from fastapi import Request

from models import Base, Attribute

class TrackObject(str, Enum):
    USER = "user"
    POST = "post"
    PRODUCT = "product"
    CATEGORY = "category"
    COMMENT = "comment"
    SPACE = "space"
    TASK = "task"
    PAYMENT = "payment"
    SESSION = "session"
    SYSTEM = "system"


class TrackAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    REMOVE = "remove"
    SEARCH = "search"
    VIEW = "view"
    DISCONNECT = "disconnect"


class Track(Base):
    _name = "tracking"

    object = Attribute(types=str)
    action = Attribute(types=str)
    params = Attribute(types=dict, default=dict)
    data = Attribute(types=dict, default=dict)  # Deprecated: kept for compatibility
    context = Attribute(default=dict)
    token = Attribute(types=str)
    ip = Attribute(types=str)

    @classmethod
    def log(
        cls,
        *,
        object: TrackObject,
        action: TrackAction,
        user: int | None,
        token: str | None,
        params: Dict[str, Any] | None = None,
        request: Request | None = None,
        context: Dict[str, Any] | None = None,
        **extra_fields,
    ) -> "Track":
        """
        Persist a unified tracking entry with normalized params and context.
        """


        payload_context = _build_context(request, context)
        ip = payload_context.get("ip")

        payload = cls(
            object=object.value,
            action=action.value,
            params=params or {},
            data=params or {},  # mirror params for older consumers
            context=payload_context,
            user=user or 0,
            token=token,
            **({"ip": ip} if ip is not None else {}),
            **extra_fields,
        )
        payload.save()
        return payload


def _resolve_source(network: int | str | None) -> str:
    mapping = {
        0: "api",
        1: "web",
        2: "tg_bot",
        3: "tma",
        "web": "web",
        "tg": "tg_bot",
        "tg_bot": "tg_bot",
        "tma": "tma",
    }
    return mapping.get(network, "direct")


def _build_context(
    request: Request | None, extra: Dict[str, Any] | None
) -> Dict[str, Any]:
    context: Dict[str, Any] = {}

    if request is not None:
        ip_value = getattr(request.state, "ip", None) or getattr(
            getattr(request, "client", None) or {}, "host", None
        )
        context.update(
            {
                "source": _resolve_source(getattr(request.state, "network", None)),
                "network": getattr(request.state, "network", None),
                "status": getattr(request.state, "status", None),
                "locale": getattr(request.state, "locale", None),
                "ip": ip_value,
                "url": getattr(request.state, "url", None),
                "user_agent": getattr(request.state, "user_agent", None),
            }
        )

    if extra:
        context.update({key: value for key, value in extra.items() if value is not None})

    return {key: value for key, value in context.items() if value is not None}


def _truncate_value(value: Any, max_length: int) -> Any:
    if isinstance(value, str) and len(value) > max_length:
        return value[: max_length - 3] + "..."
    return value


def format_changes(
    changes: Dict[str, tuple[Any, Any]] | None, max_length: int = 400
) -> Dict[str, Dict[str, Any]]:
    """
    Convert `get_changes` output to an audit-friendly dict while trimming noisy keys.
    """

    if not changes:
        return {}

    formatted: Dict[str, Dict[str, Any]] = {}
    for field, diff in changes.items():
        if field in {"updated"}:
            continue
        old_value, new_value = diff
        formatted[field] = {
            "old": _truncate_value(old_value, max_length),
            "new": _truncate_value(new_value, max_length),
        }

    return formatted


def changes_from_snapshot(snapshot: Dict[str, Any] | None) -> Dict[str, Dict[str, Any]]:
    """
    Convert a static snapshot to a change-set (old -> None) for remove actions.
    """

    if not snapshot:
        return {}

    return {
        field: {"old": _truncate_value(value, 400), "new": None}
        for field, value in snapshot.items()
    }

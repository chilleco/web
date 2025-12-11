"""
Activity feed endpoint backed by the Track model.
"""

from typing import Any, Dict, Iterable, Tuple

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess

from models.track import Track, TrackAction, TrackObject


router = APIRouter()


class AdminActivityRequest(BaseModel):
    """Filters for admin activity feed."""

    user: int | None = Field(None, description="Filter by user id", example=12)
    ip: str | None = Field(None, description="Filter by request ip", example="1.1.1.1")
    token: str | None = Field(None, description="Filter by session token")
    object: TrackObject | None = Field(None, description="Entity type")
    action: TrackAction | None = Field(None, description="Action type")
    date_from: float | None = Field(
        None, description="Created from (unix timestamp, seconds)", example=1719877200
    )
    date_to: float | None = Field(
        None, description="Created to (unix timestamp, seconds)", example=1719963600
    )
    limit: int = Field(20, ge=1, le=100, description="Items per page")
    offset: int = Field(0, ge=0, description="Pagination offset")


class AdminActivityItem(BaseModel):
    id: int
    object: TrackObject
    action: TrackAction
    user: int | None = None
    token: str | None = None
    ip: str | None = None
    created: float
    params: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)


class AdminActivityResponse(BaseModel):
    items: list[AdminActivityItem]
    count: int


def _safe_enum(value: str | None, enum_cls, default):
    try:
        return enum_cls(value) if value is not None else default
    except ValueError:
        return default


def _infer_object_action(item: Dict[str, Any]) -> Tuple[str | None, str | None]:
    if item.get("object") and item.get("action"):
        return item.get("object"), item.get("action")

    title = item.get("title")
    if not title:
        return item.get("object"), item.get("action")

    if "_" not in title:
        return item.get("object"), item.get("action")

    prefix, suffix = title.split("_", 1)
    return prefix, suffix


def _serialize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    raw_object, raw_action = _infer_object_action(item)

    return {
        "id": item["id"],
        "object": _safe_enum(raw_object, TrackObject, TrackObject.SYSTEM),
        "action": _safe_enum(raw_action, TrackAction, TrackAction.VIEW),
        "user": item.get("user"),
        "token": item.get("token"),
        "ip": item.get("ip"),
        "created": item.get("created"),
        "params": item.get("params") or item.get("data") or {},
        "context": item.get("context") or {},
    }


@router.post("/activity/", response_model=AdminActivityResponse, tags=["admin"])
async def handler(
    request: Request, data: AdminActivityRequest = Body(default_factory=AdminActivityRequest)
):
    """Return paginated track events for the admin dashboard."""

    if request.state.status < 6:
        raise ErrorAccess("activity")

    filters: Dict[str, Any] = {}
    if data.user is not None:
        filters["user"] = data.user
    if data.ip:
        filters["ip"] = data.ip
    if data.token:
        filters["token"] = data.token
    if data.object:
        filters["object"] = data.object.value
    if data.action:
        filters["action"] = data.action.value

    created_range = None
    if data.date_from or data.date_to:
        created_range = {}
        if data.date_from:
            created_range["$gte"] = data.date_from
        if data.date_to:
            created_range["$lte"] = data.date_to

    extra = {"created": created_range} if created_range else None

    fields = {
        "id",
        "object",
        "action",
        "params",
        "data",
        "context",
        "token",
        "user",
        "ip",
        "created",
        "title",
    }

    items: Iterable[Dict[str, Any]] | Dict[str, Any] | None = Track.complex(
        limit=data.limit,
        offset=data.offset,
        fields=fields,
        sort="desc",
        sortby="created",
        extra=extra,
        **filters,
    )

    if items is None:
        items_list: list[Dict[str, Any]] = []
    elif isinstance(items, dict):
        items_list = [items]
    else:
        items_list = list(items)

    return {
        "items": [_serialize_item(item) for item in items_list],
        "count": Track.count(extra=extra, **filters),
    }

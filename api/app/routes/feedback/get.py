"""
Admin endpoint to fetch feedback items.
"""

from typing import Any, Dict, Iterable

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, ConfigDict, Field
from consys.errors import ErrorAccess

from models.feedback import Feedback
from models.user import fetch_user_profiles


router = APIRouter()


class FeedbackGetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int | list[int] | None = Field(None, description="Feedback id(s)")
    limit: int | None = Field(None, ge=1, le=100, description="Items per page")
    offset: int | None = Field(None, ge=0, description="Pagination offset")
    search: str | None = Field(None, description="Search query")
    type: str | None = Field(None, description="Feedback type filter", examples=["question"])
    source: str | None = Field(None, description="Feedback source filter", examples=["faq", "footer", "tg"])


class FeedbackItem(BaseModel):
    id: int
    type: str | None = None
    source: str | None = None
    title: str | None = None
    data: str | None = None
    files: list[str] = Field(default_factory=list)
    user: int | None = None
    user_info: Dict[str, Any] | None = None
    token: str | None = None
    network: int | None = None
    user_status: int | None = None
    created: int | None = None
    updated: int | None = None


class FeedbackGetResponse(BaseModel):
    feedback: list[FeedbackItem]
    count: int | None = None


@router.post("/get/", response_model=FeedbackGetResponse, tags=["feedback"])
async def handler(request: Request, data: FeedbackGetRequest = Body(...)):
    if request.state.status < 6:
        raise ErrorAccess("get")

    fields = {
        "id",
        "type",
        "source",
        "title",
        "data",
        "files",
        "user",
        "token",
        "network",
        "user_status",
        "created",
        "updated",
    }

    filters: Dict[str, Any] = {}
    if data.type:
        filters["type"] = data.type
    if data.source:
        filters["source"] = data.source

    items: Iterable[Dict[str, Any]] | Dict[str, Any] | None = Feedback.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        search=data.search,
        sort="desc",
        sortby="created",
        fields=fields,
        **filters,
    )

    if items is None:
        items_list: list[Dict[str, Any]] = []
    elif isinstance(items, dict):
        items_list = [items]
    else:
        items_list = list(items)

    user_ids = {item.get("user") for item in items_list if item.get("user")}
    user_map = await fetch_user_profiles(user_ids, local_fields={"id", "login", "name", "surname"})

    for item in items_list:
        user_id = item.get("user")
        if isinstance(user_id, int) and user_id:
            item["user_info"] = user_map.get(user_id)

        files = item.get("files")
        if not isinstance(files, list):
            item["files"] = []

    count: int | None
    if isinstance(data.id, int):
        count = 1 if items_list else 0
    elif data.id:
        count = len(items_list)
    else:
        count = Feedback.count(search=data.search, **filters)

    return {
        "feedback": items_list,
        "count": count,
    }

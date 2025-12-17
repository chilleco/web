"""
Tasks list endpoint.

Modes:
- User mode (default): returns active + non-expired tasks with per-user completion status and formatted links.
- Admin mode (`admin=true`): returns raw task definitions for the admin UI (includes `verify`, `params`, `status`,
  `created`, `updated`), without per-user status computations. Requires `request.state.status >= 6`.
"""

import time

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess

from models.user import UserLocal
from models.task import Task


router = APIRouter()


class Type(BaseModel):
    id: int | list[int] | None = Field(None, description="Task id or ids")
    limit: int = Field(100, ge=1, le=500, description="Max items")
    offset: int | None = Field(None, ge=0, description="Pagination offset")
    admin: bool = Field(False, description="Return raw task definitions for admin UI")


@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    if data.admin:
        # Admin mode is used by `/admin/tasks` page to manage task definitions.
        if request.state.status < 6:
            raise ErrorAccess("get")

        tasks = Task.complex(
            ids=data.id,
            limit=data.limit,
            offset=data.offset,
            fields={
                "id",
                "title",
                "data",
                "button",
                "link",
                "icon",
                "size",
                "reward",
                "verify",
                "params",
                "priority",
                "expired",
                "color",
                "status",
                "created",
                "updated",
            },
            sort="desc",
            sortby="priority",
        )

        return {
            "tasks": tasks,
        }

    user = UserLocal.get(request.state.user)

    def handle(task):
        # User-facing status is derived from `UserLocal.tasks` (completed ids list).
        #
        # Status meanings (client convention):
        # 0 – cancelled (not used in user list; disabled tasks are filtered out)
        # 1 – new
        # 2 – in progress (reserved)
        # 3 – successful (completed)
        task["status"] = 3 if task["id"] in user.tasks else 1
        if task.get("link") and "{}" in task["link"]:
            # Keep DB value as literal `'{}'` and inject user social id only in user mode.
            task["link"] = task["link"].format(user.social)
        return task

    tasks = Task.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        status={"$exists": False},  # =1
        # Expiration is implemented via Base.expired (unix seconds); tasks without expired are always shown.
        extra={
            "$or": [
                {"expired": {"$exists": False}},
                {"expired": {"$gt": int(time.time())}},
            ]
        },
        fields={
            "id",
            "title",
            "data",
            "button",
            "link",
            "icon",
            "size",
            "reward",
            "priority",
            "expired",
            "color",
        },
        handler=handle,
        sort="desc",
        sortby="priority",
    )

    # Stable sort by completion so incomplete tasks stay first while preserving priority order inside groups.
    if isinstance(tasks, list):
        tasks.sort(key=lambda i: i.get("status", 0))

    return {
        "tasks": tasks,
        "balance": user.balance,
    }

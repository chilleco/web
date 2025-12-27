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
from libdev.codes import NETWORKS
from consys.errors import ErrorAccess

from models.user import User, UserLocal
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
    if data.admin and request.state.status < 6:
        raise ErrorAccess("admin")
    if request.state.status < 3:
        raise ErrorAccess("tasks")

    fields = {
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
    }
    if data.admin:
        fields |= {
            "verify",
            "params",
            "status",
            "created",
            "updated",
            "network",
        }

    user_global = await User.get(
        token=request.state.token,
        id=request.state.user,
        fields=list({"id", "link"}),
    )  # TODO: use local
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
            task["link"] = task["link"].format(user_global.link)
        if task.get("network"):
            task["network"] = NETWORKS[task["network"]]
        return task

    conds = {}
    if not data.admin:
        conds = dict(
            status={"$exists": False},  # =1
            extra={
                "$and": [
                    {
                        "$or": [
                            {"expired": {"$exists": False}},
                            {"expired": {"$gt": int(time.time())}},
                        ]
                    },
                    {
                        "$or": [
                            {"network": {"$exists": False}},
                            {"network": request.state.network},
                        ]
                    },
                ]
            },
        )

    tasks = Task.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        fields=fields,
        **conds,
        handler=handle,
        sort="desc",
        sortby="id" if data.admin else "priority",
    )

    # Stable sort by completion so incomplete tasks stay first while preserving priority order inside groups.
    if isinstance(tasks, list):
        tasks.sort(key=lambda i: i.get("status", 0))

    return {
        "tasks": tasks,
        "balance": user.balance,
    }

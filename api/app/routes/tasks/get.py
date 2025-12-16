import time

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel

from models.user import UserLocal
from models.task import Task


router = APIRouter()


class Type(BaseModel):
    id: int | list[int] | None = None
    limit: int = 10
    offset: int | None = None


@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    user = UserLocal.get(request.state.user)

    def handle(task):
        # 0 – cancelled
        # 1 – new
        # 2 – in progress
        # 3 – successful
        task["status"] = 3 if task["id"] in user.tasks else 1
        if task.get("link") and "{}" in task["link"]:
            task["link"] = task["link"].format(user.social)
        return task

    tasks = Task.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        status={"$exists": False},  # =1
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
            "expired",
            "color",
        },
        handler=handle,
        sortby="priority",
    )

    # Sort by completed
    if isinstance(tasks, list):
        tasks.sort(key=lambda i: i.get("status", 0))

    return {
        "tasks": tasks,
        "balance": user.balance,
    }

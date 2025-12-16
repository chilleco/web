from fastapi import APIRouter, Body
from pydantic import BaseModel

from lib import report
from models.task import Task


router = APIRouter()


class Type(BaseModel):
    id: int | None = None
    title: dict | None = None
    data: dict | None = None
    link: str | None = None
    icon: str | None = None
    size: int | None = None
    expired: int | None = None
    reward: int | None = None
    verify: str | None = None


@router.post("/save/")
async def handler(
    data: Type = Body(...),
):
    # # No access
    # if request.state.status < 2:
    #     raise ErrorAccess("save")

    # Get
    new = False
    if data.id:
        task = Task.get(data.id)
    else:
        task = Task(
            # user=request.state.user,
            # token=None if request.state.user else request.state.token,
        )
        new = True

    # Change fields
    task.title = data.title
    task.data = data.data
    task.link = data.link
    task.icon = data.icon
    task.size = data.size
    task.expired = data.expired
    task.reward = data.reward
    task.verify = data.verify

    # Save
    task.save()

    # Report
    if new:
        await report.important(
            "New task",
            {
                "task": task.id,
                "title": task.title.get("en", f"Task #{task.id}"),
                # "user": request.state.user,
            },
        )

    # Response
    return {
        "id": task.id,
        "new": new,
    }

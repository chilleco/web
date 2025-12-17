"""
Task completion check endpoint.

Given a task id:
- blocks disabled (`status==0`) and expired tasks (acts like "not found" for clients)
- runs the configured verify module (`api/app/verify/<task.verify>.py`)
- on success, awards `task.reward` to `UserLocal.balance` and persists the task id in `UserLocal.tasks`
  so the task is claimable only once.
"""

import importlib
import time

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorWrong

from models.user import UserLocal
from models.task import Task


router = APIRouter()


class Type(BaseModel):
    id: int = Field(..., description="Task id")


@router.post("/check/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    user = UserLocal.get(request.state.user)

    if data.id in user.tasks:
        return {
            "old": 3,
            "new": 3,
            "reward": 0,
            "balance": user.balance,
        }

    task = Task.get(data.id)

    # Disabled/cancelled tasks must not be claimable
    if task.status == 0:
        # Use `id` to keep API error shape consistent and avoid leaking task state.
        raise ErrorWrong("id")

    # Expired tasks must not be claimable
    if task.expired and int(task.expired) <= int(time.time()):
        # Use `id` to keep API error shape consistent and avoid leaking task state.
        raise ErrorWrong("id")

    verify_key = (task.verify or "").strip()
    if not verify_key:
        raise ErrorWrong("verify")

    reward = int(task.reward or 0)

    try:
        module = importlib.import_module(f"verify.{verify_key}")
    except ModuleNotFoundError as exc:
        raise ErrorWrong("verify") from exc

    old = 1
    status = await module.check(request.state.user, task.params)

    if status == 3:
        user.balance += reward
        user.tasks.append(task.id)
        user.save()

        # await report.important(
        #     "Complete task",
        #     {
        #         "user": user.get_name(),
        #         "task": f"#{task.id} {task.title}",
        #     },
        # )

    return {
        "old": old,
        "new": status,
        "reward": reward,
        "balance": user.balance,
    }

import importlib

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from prometheus_client import Counter

from models.user import UserLocal
from models.task import Task


router = APIRouter()
metric_tasks = Counter(
    "tasks_completed", "Total number of completed tasks", ["task", "user"]
)


class Type(BaseModel):
    id: int


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
    module = importlib.import_module(f"verify.{task.verify}")

    old = 1
    status = await module.check(request.state.user, task.params)

    if status == 3:
        user.balance += task.reward
        user.tasks.append(task.id)
        user.save()

        metric_tasks.labels(task=task.id, user=user.id).inc()
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
        "reward": task.reward,
        "balance": user.balance,
    }

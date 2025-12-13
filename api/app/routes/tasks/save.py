"""
Create or update viral tasks.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict
from consys.errors import ErrorAccess, ErrorWrong

from models.task import Task
from models.track import Track, TrackAction, TrackObject, format_changes
from .get import TaskResponse, serialize_task


router = APIRouter()


class TaskSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int | None = Field(None, description="Task id for update", example=3)
    title: str | None = Field(None, description="Task title", example="Invite 2 friends")
    description: str | None = Field(None, description="Task description", example="Bring new friends")
    category: str | None = Field(None, description="Task category", example="daily")
    icon: str | None = Field(None, description="Icon identifier", example="friends")
    reward_label: str | None = Field(None, description="Human readable reward label", example="+50 energy")
    reward_value: float | None = Field(None, description="Numeric reward value", example=50)
    reward_unit: str | None = Field(None, description="Reward unit", example="energy")
    progress_current: int | None = Field(None, ge=0, description="Current progress", example=4)
    progress_target: int | None = Field(None, ge=1, description="Target value", example=10)
    state: str | None = Field(None, description="Task state", example="ready")
    action: str | None = Field(None, description="Action type", example="claim")
    link: str | None = Field(None, description="CTA link", example="https://example.com")
    order: int | None = Field(None, description="Ordering weight", example=1)
    status: int | None = Field(None, description="Visibility flag", example=1)
    locale: str | None = Field(None, description="Locale restriction", example="en")


class TaskSaveResponse(BaseModel):
    id: int
    new: bool
    task: TaskResponse


def _apply_task_fields(task: Task, data: TaskSaveRequest) -> None:
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.category is not None:
        task.category = data.category
    if data.icon is not None:
        task.icon = data.icon
    if data.reward_label is not None:
        task.reward_label = data.reward_label
    if data.reward_value is not None:
        task.reward_value = float(data.reward_value)
    if data.reward_unit is not None:
        task.reward_unit = data.reward_unit
    if data.progress_current is not None:
        task.progress_current = max(int(data.progress_current), 0)
    if data.progress_target is not None:
        task.progress_target = max(int(data.progress_target), 1)
    if data.state is not None:
        task.state = data.state
    if data.action is not None:
        task.action = data.action
    if data.link is not None:
        task.link = data.link
    if data.order is not None:
        task.order = int(data.order)
    if data.status is not None:
        task.status = data.status
    if data.locale is not None:
        task.locale = data.locale


@router.post("/save/", response_model=TaskSaveResponse)
async def handler(request: Request, data: TaskSaveRequest = Body(...)):
    """Create or update a viral task."""

    if request.state.status < 5:
        raise ErrorAccess("save")

    new = False

    if data.id:
        task = Task.get(data.id)
        if not task:
            raise ErrorWrong("task")
    else:
        if data.title is None:
            raise ErrorWrong("title")
        task = Task(
            title=data.title,
            description=data.description or "",
            category=data.category or "daily",
            icon=data.icon,
            reward_label=data.reward_label or "",
            reward_value=float(data.reward_value or 0),
            reward_unit=data.reward_unit,
            progress_current=max(int(data.progress_current or 0), 0),
            progress_target=max(int(data.progress_target or 1), 1),
            state=data.state or "in_progress",
            action=data.action or "start",
            link=data.link,
            order=int(data.order or 0),
            status=data.status if data.status is not None else 1,
            token=request.state.token,
            locale=data.locale,
        )
        new = True

    _apply_task_fields(task, data)

    changes = format_changes(task.get_changes())
    task.save()

    Track.log(
        object=TrackObject.TASK,
        action=TrackAction.CREATE if new else TrackAction.UPDATE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": task.id,
            "changes": changes,
        },
    )

    return {
        "id": task.id,
        "new": new,
        "task": serialize_task(task),
    }

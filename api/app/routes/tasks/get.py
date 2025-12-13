"""
Get viral tasks list.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict

from models.task import Task
from models.track import Track, TrackAction, TrackObject
from .defaults import DEFAULT_TASKS


router = APIRouter()


class TaskResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    title: str
    description: str | None = None
    category: str = Field(..., description="Task category", examples=["daily"])
    icon: str | None = Field(None, description="Icon identifier", examples=["share"])
    reward_label: str | None = Field(None, description="Human-friendly reward label", example="+50 energy")
    reward_value: float | None = Field(None, description="Numeric reward value", example=50)
    reward_unit: str | None = Field(None, description="Reward unit", example="energy")
    progress_current: int = Field(..., ge=0, description="Current progress value", example=4)
    progress_target: int = Field(..., ge=1, description="Target value to complete task", example=10)
    state: str = Field(..., description="Task state", examples=["in_progress", "ready", "claimed"])
    action: str = Field(..., description="Action type", examples=["start", "claim"])
    link: str | None = Field(None, description="Action link for CTA", example="https://example.com")
    order: int = Field(0, description="Ordering weight", example=1)
    status: int | None = Field(None, description="Visibility flag", example=1)
    locale: str | None = Field(None, description="Locale bound task", example="en")
    created: int | None = Field(None, description="Created timestamp")
    updated: int | None = Field(None, description="Updated timestamp")


class TasksGetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int | list[int] | None = Field(None, description="Single id or list of ids", examples=[1, [1, 2]])
    category: str | None = Field(None, description="Filter by category", example="daily")
    state: str | None = Field(None, description="Filter by state", example="ready")
    status: int | None = Field(None, description="Filter by status", example=1)
    limit: int | None = Field(None, ge=1, description="Limit for pagination", example=50)
    offset: int | None = Field(None, ge=0, description="Offset for pagination", example=0)
    locale: str | None = Field(None, description="Preferred locale", example="en")


class TasksGetResponse(BaseModel):
    tasks: list[TaskResponse]
    count: int | None = Field(None, description="Total count (only for list requests)")


def serialize_task(task: Task | dict) -> TaskResponse:
    payload = task.json() if hasattr(task, "json") else task
    return TaskResponse(
        id=payload.get("id"),
        title=payload.get("title"),
        description=payload.get("description"),
        category=payload.get("category") or "daily",
        icon=payload.get("icon"),
        reward_label=payload.get("reward_label"),
        reward_value=payload.get("reward_value"),
        reward_unit=payload.get("reward_unit"),
        progress_current=int(payload.get("progress_current") or 0),
        progress_target=max(int(payload.get("progress_target") or 1), 1),
        state=payload.get("state") or "in_progress",
        action=payload.get("action") or "start",
        link=payload.get("link"),
        order=int(payload.get("order") or 0),
        status=payload.get("status"),
        locale=payload.get("locale"),
        created=payload.get("created"),
        updated=payload.get("updated"),
    )


def _seed_default_tasks(request: Request) -> bool:
    """
    Insert default viral tasks when DB is empty.
    """
    if Task.count(status={"$ne": 0}) > 0:
        return False

    for index, payload in enumerate(DEFAULT_TASKS):
        task = Task(
            title=payload["title"],
            description=payload.get("description", ""),
            category=payload.get("category", "daily"),
            icon=payload.get("icon"),
            reward_label=payload.get("reward_label"),
            reward_value=payload.get("reward_value"),
            reward_unit=payload.get("reward_unit"),
            progress_current=int(payload.get("progress_current") or 0),
            progress_target=max(int(payload.get("progress_target") or 1), 1),
            state=payload.get("state", "in_progress"),
            action=payload.get("action", "start"),
            link=payload.get("link"),
            order=int(payload.get("order") or index),
            status=payload.get("status", 1),
            token=getattr(request.state, "token", None),
            locale=payload.get("locale"),
        )
        task.save()

        Track.log(
            object=TrackObject.TASK,
            action=TrackAction.CREATE,
            user=getattr(request.state, "user", None),
            token=getattr(request.state, "token", None),
            request=request,
            params={
                "id": task.id,
                "changes": {"seed": payload.get("title")},
            },
        )

    return True


@router.post("/get/", response_model=TasksGetResponse)
async def handler(request: Request, data: TasksGetRequest = Body(...)):
    """Return viral tasks for referrals."""

    # Seed default tasks on the first call to keep FE populated
    _seed_default_tasks(request)

    status_filter = data.status if data.status is not None else {"$ne": 0}
    locale_filter = {"$in": [None, data.locale]} if data.locale else None

    params = dict(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        category=data.category,
        state=data.state,
        status=status_filter,
        locale=locale_filter,
        fields={
            "id",
            "title",
            "description",
            "category",
            "icon",
            "reward_label",
            "reward_value",
            "reward_unit",
            "progress_current",
            "progress_target",
            "state",
            "action",
            "link",
            "order",
            "status",
            "locale",
            "created",
            "updated",
        },
    )

    tasks = Task.complex(**params)

    if not isinstance(tasks, list):
        tasks = [tasks] if tasks else []

    tasks = sorted(tasks, key=lambda task: (task.get("order") or 0, task.get("id") or 0))

    # Track search usage
    if data.category or data.state:
        Track.log(
            object=TrackObject.TASK,
            action=TrackAction.SEARCH,
            user=getattr(request.state, "user", None),
            token=getattr(request.state, "token", None),
            request=request,
            params={
                "category": data.category,
                "state": data.state,
                "limit": data.limit,
                "offset": data.offset,
                "locale": data.locale,
            },
        )

    return {
        "tasks": [serialize_task(task) for task in tasks],
        "count": len(tasks) if data.id is None else None,
    }

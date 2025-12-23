"""
Admin endpoint for creating/updating task definitions.

Notes:
- Admin-only (`request.state.status >= 6`) because tasks affect user rewards.
- Acts as a PATCH-like endpoint: only fields provided (non-None) are applied.
  (ConSys ignores `None` assignments; clearing/removing a field requires server-side `del task.<field>`.)
- On create, `title` and `verify` are required.
- Every write is audited via `Track` with `TrackObject.TASK`.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, ConfigDict, Field
from libdev.codes import get_network
from consys.errors import ErrorAccess, ErrorWrong

from lib import report
from models.task import Task
from models.track import Track, TrackAction, TrackObject, format_changes


router = APIRouter()


class TaskSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int | None = Field(None, description="Task id for update", examples=[3])
    title: dict | None = Field(
        None,
        description='Localized task title (e.g., {"en": "Initial Bonus", "ru": "Начальный бонус"})',
        examples=[{"en": "Initial Bonus", "ru": "Начальный бонус"}],
    )
    data: dict | None = Field(
        None,
        description="Localized task description",
        examples=[{"en": "Do something", "ru": "Сделай что-то"}],
    )
    button: dict | None = Field(
        None,
        description="Localized button label",
        examples=[{"en": "Claim", "ru": "Получить"}],
    )
    link: str | None = Field(
        None,
        description="Task action link (may contain {} placeholder for user social id)",
        examples=["https://t.me/share/url?url=https://t.me/bot?start={}", "story"],
    )
    icon: str | None = Field(
        None,
        description="FontAwesome icon key without prefix (e.g. `gift`, `home`)",
        examples=["gift"],
    )
    color: str | None = Field(
        None,
        description="Color key used by the client (green/violet/blue/orange)",
        examples=["green"],
    )
    size: int | None = Field(
        None, description="Optional size hint for the client", examples=[0]
    )
    expired: int | None = Field(
        None, description="Expiration timestamp (unix seconds)", examples=[1733962020]
    )
    reward: int | None = Field(
        None, ge=0, description="Reward amount in inner coins", examples=[1000]
    )
    verify: str | None = Field(
        None,
        description="Verify module key (api/app/verify/*.py)",
        examples=["simple", "channel", "invite"],
    )
    params: dict | None = Field(
        None,
        description="Verify params payload for the verify module",
        examples=[{"chat_id": -1002273788200}, {"count": 3}],
    )
    priority: int | None = Field(
        None, description="Sorting priority (DESC)", examples=[1000]
    )
    status: int | None = Field(
        None, description="0=disabled/cancelled, 1=active", examples=[0]
    )
    network: str | None = Field(
        None,
        description="Optional network restriction (e.g., tg/vk/web). Converted via libdev.codes.get_network.",
        examples=["tg"],
    )


class TaskSaveResponse(BaseModel):
    id: int
    new: bool
    task: dict


@router.post("/save/", response_model=TaskSaveResponse, tags=["tasks"])
async def handler(
    request: Request,
    data: TaskSaveRequest = Body(...),
):
    if request.state.status < 6:
        raise ErrorAccess("save")

    new = False
    if data.id:
        task = Task.get(data.id)
    else:
        if not data.title:
            raise ErrorWrong("title")
        if not data.verify:
            raise ErrorWrong("verify")

        task = Task()
        new = True

    # Apply only provided fields (PATCH semantics).
    if data.title is not None:
        if not isinstance(data.title, dict) or not data.title:
            raise ErrorWrong("title")
        task.title = data.title
    if data.data is not None:
        task.data = data.data
    if data.button is not None:
        task.button = data.button
    if data.link is not None:
        task.link = data.link
    if data.icon is not None:
        task.icon = data.icon
    if data.color is not None:
        task.color = data.color
    if data.size is not None:
        task.size = data.size
    if data.expired is not None:
        task.expired = data.expired
    if data.reward is not None:
        task.reward = data.reward
    if data.verify is not None:
        task.verify = data.verify
    if data.params is not None:
        task.params = data.params
    if data.priority is not None:
        task.priority = data.priority
    if data.status is not None:
        task.status = int(data.status)
    if data.network is not None:
        if data.network:
            task.network = get_network(data.network)
        else:
            del task.network

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

    if new:
        await report.important(
            "New task",
            {
                "task": task.id,
                "title": (task.title or {}).get("en", f"Task #{task.id}"),
            },
        )

    return {
        "id": task.id,
        "new": new,
        "task": task.json(),
    }

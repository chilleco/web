"""
User endpoint to submit feedback.
"""

from enum import Enum
from typing import Any

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, ConfigDict, Field
from consys.errors import ErrorWrong

from lib import report
from models.feedback import Feedback
from models.track import Track, TrackAction, TrackObject, _resolve_source


router = APIRouter()


class FeedbackType(str, Enum):
    QUESTION = "question"
    BUG = "bug"
    REQUEST = "request"
    IMPROVE = "improve"


class FeedbackSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: FeedbackType = Field(..., description="Feedback category key", examples=["question"])
    data: str = Field(..., min_length=1, description="Feedback message")
    files: list[str] = Field(default_factory=list, description="Uploaded file URLs (optional)")
    source: str | None = Field(
        None,
        description="UI origin (e.g. faq/footer/tg). When omitted, derived from auth network.",
        examples=["faq", "footer", "tg"],
    )


class FeedbackSaveResponse(BaseModel):
    id: int
    new: bool


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@router.post("/save/", response_model=FeedbackSaveResponse, tags=["feedback"])
async def handler(request: Request, data: FeedbackSaveRequest = Body(...)):
    if not data.data.strip():
        raise ErrorWrong("data")

    feedback = Feedback(
        user=request.state.user,
        token=request.state.token,
    )
    feedback.type = data.type.value
    feedback.source = data.source or _resolve_source(getattr(request.state, "network", None))
    feedback.data = data.data.strip()
    feedback.files = [str(item) for item in (data.files or []) if isinstance(item, str) and item]
    feedback.network = _to_int(getattr(request.state, "network", 0), 0)
    feedback.user_status = _to_int(getattr(request.state, "status", 3), 3)

    feedback.title = (feedback.data or "")[:80]
    feedback.save()

    Track.log(
        object=TrackObject.FEEDBACK,
        action=TrackAction.CREATE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": feedback.id,
            "type": feedback.type,
            "source": feedback.source,
        },
    )

    await report.important(
        "Feedback",
        {
            "id": feedback.id,
            "type": feedback.type,
            "source": feedback.source,
            "user": request.state.user,
            "token": request.state.token,
            "network": getattr(request.state, "network", None),
            "user_status": getattr(request.state, "status", None),
            "files": len(feedback.files or []),
            "text": (feedback.data or "")[:500],
        },
    )

    return {
        "id": feedback.id,
        "new": True,
    }

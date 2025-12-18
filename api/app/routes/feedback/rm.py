"""
Admin endpoint to remove feedback items.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, ConfigDict, Field
from consys.errors import ErrorAccess

from models.feedback import Feedback
from models.track import Track, TrackAction, TrackObject


router = APIRouter()


class FeedbackRmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int = Field(..., description="Feedback id", examples=[12])


@router.post("/rm/", tags=["feedback"])
async def handler(request: Request, data: FeedbackRmRequest = Body(...)):
    if request.state.status < 6:
        raise ErrorAccess("rm")

    feedback = Feedback.get(data.id)
    Track.log(
        object=TrackObject.FEEDBACK,
        action=TrackAction.REMOVE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={"id": feedback.id},
    )
    feedback.rm()

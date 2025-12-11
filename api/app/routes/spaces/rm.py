"""
Remove space and detach users.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess

from models.space import Space
from models.track import Track, TrackAction, TrackObject
from .utils import detach_space_from_users


router = APIRouter()


class SpaceRemoveRequest(BaseModel):
    id: int = Field(..., description="Space id to remove", example=4)


@router.post("/rm/")
async def handler(request: Request, data: SpaceRemoveRequest = Body(...)):
    """Delete space."""

    if request.state.status < 2 or not request.state.user:
        raise ErrorAccess("rm")

    space = Space.get(data.id)

    if request.state.status < 4 and request.state.user not in (space.users or []):
        raise ErrorAccess("rm")

    snapshot = space.json(fields={"id", "title", "users"})
    detach_space_from_users(space)
    space.rm()

    Track.log(
        object=TrackObject.SPACE,
        action=TrackAction.REMOVE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={"before": snapshot},
    )

    return {"result": True}

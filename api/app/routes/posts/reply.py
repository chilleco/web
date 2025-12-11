"""
Reply method of the post object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from lib import report
from models.post import Post
from models.comment import Comment
from models.track import Track, TrackAction, TrackObject, format_changes


router = APIRouter()


class Type(BaseModel):
    post: int
    id: int | None = None
    data: str | None = None
    status: int | None = None


@router.post("/reply/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Save"""

    # TODO: fix access to unblock yourself comment

    # No access
    if request.state.status < 2:
        raise ErrorAccess("save")

    # Check post
    Post.get(data.post, fields={})

    # Get
    new = False
    before_state = None
    if data.id:
        comment = Comment.get(data.id)

        if (
            request.state.status < 5
            and (not comment.user or comment.user != request.state.user)
            and comment.token != request.state.token
        ):
            raise ErrorAccess("save")
        before_state = comment.json(fields={"id", "post", "status", "data"})

    else:
        comment = Comment(
            user=request.state.user,
            token=None if request.state.user else request.state.token,
            post=data.post,
        )
        new = True

    # Change fields
    comment.data = data.data
    comment.status = data.status

    # Save
    changes = format_changes(comment.get_changes())
    comment.save()

    # Track
    Track.log(
        object=TrackObject.COMMENT,
        action=TrackAction.CREATE if new else TrackAction.UPDATE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": comment.id,
            "post": comment.post,
            "before": before_state,
            "after": comment.json(fields={"id", "post", "status", "data"}),
            "changes": changes,
        },
    )

    # Report
    if new:
        await report.important(
            "Reply",
            {
                "post": comment.post,
                "comment": comment.data,
                "user": request.state.user,
            },
        )

    # Response
    return {
        "id": comment.id,
        "new": new,
        "comment": comment.json(),
    }

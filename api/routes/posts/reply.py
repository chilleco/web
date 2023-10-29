"""
Reply method of the post object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from models.post import Post
from models.comment import Comment
from models.track import Track
from lib import report


router = APIRouter()


class Type(BaseModel):
    post: int
    id: int = None
    data: str = None
    status: int = None

@router.post("/reply/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Save """

    # TODO: fix access to unblock yourself comment

    # No access
    if request.state.status < 2:
        raise ErrorAccess('save')

    # Check post
    Post.get(data.post, fields={})

    # Get
    new = False
    if data.id:
        comment = Comment.get(data.id)

        if (
            request.state.status < 5
            and (not comment.user or comment.user != request.state.user)
            and comment.token != request.state.token
        ):
            raise ErrorAccess('save')

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
    comment.save()

    # Track
    Track(
        title='comment_add' if new else 'comment_edit',
        data={
            'id': comment.id,
            'data': comment.data,
            'status': comment.status,
        },
        user=request.state.user,
        token=request.state.token,
        ip=request.state.ip,
    ).save()

    # Report
    if new:
        await report.important("Reply", {
            'post': comment.post,
            'comment': comment.data,
            'user': request.state.user,
        })

    # Response
    return {
        'id': comment.id,
        'new': new,
        'comment': comment.json(),
    }

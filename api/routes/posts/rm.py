"""
The removal method of the post object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from models.post import Post
from models.track import Track


router = APIRouter()


class Type(BaseModel):
    id: int

@router.post("/rm/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Delete """

    # No access
    if request.state.status < 2:
        raise ErrorAccess('rm')

    # Get
    post = Post.get(data.id)

    # No access
    if (
        request.state.status < 6
        and (not post.user or post.user != request.state.user)
        and post.token != request.state.token
    ):
        raise ErrorAccess('rm')

    # Delete
    post.rm()

    # Track
    Track(
        title='post_rm',
        data={
            'id': data.id,
        },
        user=request.state.user,
        token=request.state.token,
        ip=request.state.ip,
    ).save()

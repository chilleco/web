"""
The creating and editing method of the product object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from libdev.lang import to_url
from consys.errors import ErrorAccess

from models.post import Post
from models.track import Track
from lib import report


router = APIRouter()


class Type(BaseModel):
    id: int = None
    title: str = None
    description: str = None
    data: str = None
    image: str = None
    tags: list[str] = None
    status: int = None

@router.post("/save/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Save """

    # TODO: fix access to unblock yourself post

    # No access
    if request.state.status < 2:
        raise ErrorAccess('save')

    # Get
    new = False
    if data.id:
        post = Post.get(data.id)

        if (
            request.state.status < 5
            and (not post.user or post.user != request.state.user)
            and post.token != request.state.token
        ):
            raise ErrorAccess('save')

    else:
        post = Post(
            user=request.state.user,
            token=None if request.state.user else request.state.token,
        )
        new = True

    # Change fields
    post.title = data.title
    post.description = data.description
    post.data = data.data
    post.image = data.image
    post.tags = data.tags
    post.status = data.status

    # Save
    post.save()

    # Track
    Track(
        title='post_add' if new else 'post_edit',
        data={
            'id': post.id,
            'title': post.title,
            'data': post.data,
            'image': post.image,
            'tags': post.tags,
            'status': post.status,
        },
        user=request.state.user,
        token=request.state.token,
        ip=request.state.ip,
    ).save()

    # Report
    if new:
        await report.important("Save post", {
            'post': post.id,
            'title': post.title,
            'user': request.state.user,
        })

    data = post.json()

    # URL
    data['url'] = to_url(post.title) or ""
    if data['url']:
        data['url'] += "-"
    data['url'] += f"{post.id}"

    # Response
    return {
        'id': post.id,
        'new': new,
        'post': data,
    }

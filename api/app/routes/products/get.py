"""
The getting method of the product object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from models.post import Post


router = APIRouter()


class Type(BaseModel):
    id: int | list[int] | None = None


@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Get"""

    # No access
    # TODO: -> middleware
    if request.state.status < 2:
        raise ErrorAccess("get")

    extend = isinstance(data.id, int)

    # Fields
    fields = {
        "id",
        "title",
        "data",
        "image",
        "url",
        "created",
        "updated",
        "status",
    }
    if extend:
        fields |= {
            "description",
            "user",
        }

    # Get
    posts = Post.complex(
        ids=data.id,
        fields=fields,
        status={"$exists": False} if request.state.status < 5 else None,
    )

    # Sort
    if isinstance(posts, list):
        posts = sorted(posts, key=lambda x: x["updated"], reverse=True)

    # Response
    return {
        "products": posts,
        "count": len(posts),
    }

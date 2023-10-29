"""
The removal method of the category object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from models.category import Category
from models.post import Post
from models.track import Track
from services.cache import cache_categories


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
    category = Category.get(data.id)

    if request.state.status < 6 and category.user != request.state.user:
        raise ErrorAccess('rm')

    # Reset subcategories
    for subcategory in Category.get(parent=category.id):
        del subcategory.parent
        subcategory.save()

    # Reset posts
    for post in Post.get(category=category.id):
        del post.category
        post.save()

    # Delete
    category.rm()

    # Cache renewal
    cache_categories()

    # Track
    Track(
        title='cat_rm',
        data={
            'id': data.id,
        },
        user=request.state.user,
        token=request.state.token,
        ip=request.state.ip,
    ).save()

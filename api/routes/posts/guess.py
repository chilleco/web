"""
The recommendation method of the post object of the API
"""

import re

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from libdev.lang import to_url
from consys.errors import ErrorAccess

from lib.queue import get
from models.post import Post
from models.category import Category


router = APIRouter()


def get_posts(ids, limit, category, locale):
    """Get posts by category, excluding by ID"""

    # Fields
    fields = {
        "id",
        "title",
        "description",
        "data",
        "reactions",
        "image",
        "category",
        "locale",
        "created",
        "updated",
        "status",
        "user",
        # 'geo',
    }

    # Processing
    def handle(post):
        # Cover from the first image
        if not post.get("image"):
            res = re.search(r'<img src="([^"]*)">', post["data"])
            if res is not None:
                post["image"] = res.groups()[0]

        # Content
        post["data"] = re.sub(r"<[^>]*>", "", post["data"]).replace("&nbsp;", " ")

        # URL
        post["url"] = to_url(post["title"]) or ""
        if post["url"]:
            post["url"] += "-"
        post["url"] += f"{post['id']}"

        return post

    # Get
    posts = Post.complex(
        id={"$nin": ids} if ids else None,
        limit=limit,
        fields=fields,
        status={"$exists": False},
        category=(
            {
                "$in": Category.get_childs(category),
            }
            if category
            else None
        ),
        locale=locale
        and {
            "$in": [None, locale],
        },  # NOTE: None → all locales
        handler=handle,
    )

    return posts


class Type(BaseModel):
    id: int | list[int] | None = None
    category: int | None = None
    locale: str | None = None
    limit: int = 3


@router.post("/guess/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Recommend"""

    # No access
    # TODO: -> middleware
    if request.state.status < 2:
        raise ErrorAccess("get")

    if data.id is None:
        ids = []
    elif isinstance(data.id, int):
        ids = [data.id]
    else:
        ids = data.id

    posts = []
    if data.category:
        posts.extend(get_posts(ids, int(data.limit // 3), data.category, data.locale))
        ids.extend([post["id"] for post in posts])

        posts.extend(
            get_posts(
                ids,
                int(data.limit // 3),
                (get("category_parents", {}).get(data.category, []) + [data.category])[
                    0
                ],
                data.locale,
            )
        )
        ids.extend([post["id"] for post in posts])

    posts.extend(get_posts(ids, data.limit - len(posts), None, data.locale))

    # Response
    return {
        "posts": posts,
    }

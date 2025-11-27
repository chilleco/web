"""
The getting method of the post object of the API
"""

import re

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from libdev.lang import get_pure
from consys.errors import ErrorAccess

# from models.user import User
from models.post import Post
from models.comment import Comment
from models.category import Category
from models.track import Track
from models.reaction import Reaction
from lib.queue import get


router = APIRouter()


class Type(BaseModel):
    id: int | list[int] | None = None
    limit: int = 12  # 24 ?
    offset: int | None = None
    search: str | None = None
    my: bool | None = None
    category: int | None = None
    locale: str | None = None
    utm: str | None = None
    # TODO: fields: list[str] = None


# pylint: disable=too-many-statements,too-many-branches
@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    # No access
    # TODO: -> middleware
    if request.state.status < 2:
        raise ErrorAccess("get")

    extend = isinstance(data.id, int)

    # Action tracking
    if data.search:
        Track(
            title="post_search",
            data={"search": data.search},
            user=request.state.user,
            token=request.state.token,
            ip=request.state.ip,
        ).save()

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
            "category",
            "locale",
            "user",
        }

    # Processing

    if extend:

        def handle(post):
            # Add category info
            if post.get("category"):
                category_ids = get("category_ids")
                post["category_data"] = category_ids.get(post["category"]).json(
                    fields={"id", "url", "title"},
                )
                post["category_data"]["parents"] = [
                    category_ids[parent].json(fields={"id", "url", "title"})
                    for parent in get("category_parents", {}).get(post["category"], [])
                    if parent in category_ids
                ]

            # Author
            # FIXME: get via core API
            # if post.get('user'):
            #     post['author'] = User.get(post['user']).json(fields={
            #         'id', 'login', 'name', 'surname', 'title', 'image',
            #     })

            # Comments
            post["comments"] = []
            # users = {}
            for comment in Comment.complex(
                post=post["id"],
                status={"$exists": False},
                fields={"id", "data", "user", "created"},
            ):
                if comment.get("user"):
                    # FIXME: get via core API
                    # if comment['user'] not in users:
                    #     users[comment['user']] = User.complex(
                    #         ids=comment['user'],
                    #         fields={
                    #             'id', 'name', 'surname', 'title', 'image',
                    #         },
                    #     )
                    # comment['user'] = users[comment['user']]
                    del comment["user"]
                else:
                    del comment["user"]
                post["comments"].append(comment)

            # Views counter
            post["views"] = len(
                Reaction.get(
                    type={"$exists": False},
                    post=data.id,
                )
            )

            return post

    else:

        def handle(post):
            # Cover from the first image
            if not post.get("image"):
                res = re.search(r'<img src="([^"]*)">', post["data"])
                if res is not None:
                    post["image"] = res.groups()[0]

            # Content
            post["data"] = get_pure(post["data"]).split("\n")[0]

            return post

    cond = {}

    # Personal
    if data.my:
        cond["$or"] = [
            {"user": request.state.user},
            {"token": request.state.token},
        ]
    elif data.my is not None:
        cond["user"] = {"$ne": request.state.user}
        cond["token"] = {"$ne": request.state.token}

    # Get
    params = dict(
        status={"$exists": False} if request.state.status < 5 else None,
        category=(
            {"$in": Category.get_childs(data.category)} if data.category else None
        ),
        locale=(
            data.locale and {"$in": [None, data.locale]}
        ),  # NOTE: None → all locales
        extra=cond or None,
        search=data.search,
    )
    posts = Post.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        **params,
        fields=fields,
        handler=handle,
    )

    # Count
    count = None
    if not data.id:
        count = Post.count(**params)

    # Sort
    if isinstance(posts, list):
        posts = sorted(posts, key=lambda x: x["updated"], reverse=True)

    # Views counter
    # pylint: disable=too-many-nested-blocks
    if extend and (request.state.user or request.state.token):
        reactions = Reaction.get(
            type={"$exists": False},
            post=data.id,
            extra={
                "$or": [
                    {"user": request.state.user},
                    {"token": request.state.token},
                ],
            },
        )
        if reactions:
            if request.state.user:
                viewed = False
                for reaction in reactions[::-1]:
                    if reaction.user:
                        if reaction.user == request.state.user:
                            viewed = True
                        continue
                    if viewed:
                        reaction.rm()
                        continue
                    reaction.user = request.state.user
                    reaction.save()
                    viewed = True
        else:
            Reaction(
                post=data.id,
                user=request.state.user,
                token=request.state.token,
                utm=data.utm or None,
            ).save()

    # Response
    return {
        "posts": posts,
        "count": count,
    }

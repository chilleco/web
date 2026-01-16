"""
The getting method of the category object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess, ErrorWrong

from models.category import Category
from lib.queue import get


router = APIRouter()


class Type(BaseModel):
    id: int | None = None
    url: str | None = None
    locale: str | None = None


@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Get"""

    # No access
    if request.state.status < 2:
        raise ErrorAccess("get")

    # Fields
    fields = {
        "id",
        "title",
        "description",
        "data",
        "image",
        "parent",
        "locale",
        "url",
        "status",
        "created",
        "updated",
        "icon",
        "color",
    }

    # Get by url
    if data.url:
        category_urls = await get("category_urls") or {}
        category = category_urls.get(data.url)
        if not category:
            raise ErrorWrong("url")
        data.id = category.id

    # Get
    categories = Category.get_tree(
        ids=data.id,
        fields=fields,
        locale=data.locale
        and {
            "$in": [None, data.locale],
        },  # NOTE: None → all locales
    )

    if data.id:
        categories = categories[0]

        category_ids = await get("category_ids") or {}
        category_parents = await get("category_parents") or {}
        categories["parents"] = [
            category_ids[parent].json(fields={"id", "url", "title"})
            for parent in category_parents.get(categories["id"], [])
            if parent in category_ids
        ]

    # Response
    return {
        "categories": categories,
    }

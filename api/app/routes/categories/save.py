"""
Category creation and updating endpoint (unified).
"""

from fastapi import APIRouter, Body, Depends, Request
from pydantic import BaseModel, Field
from libdev.lang import to_url
from consys.errors import ErrorAccess, ErrorWrong

from lib import log
from models.category import Category
from models.track import Track, TrackAction, TrackObject, format_changes
from services.auth import sign
from services.cache import cache_categories


router = APIRouter()


class CategorySaveRequest(BaseModel):
    """Request model for creating/updating a category"""

    id: int | None = Field(None, description="Category ID for update", example=1)
    title: str | None = Field(
        None,
        min_length=1,
        max_length=100,
        description="Category title",
        example="Technology",
    )
    url: str | None = Field(
        None,
        max_length=100,
        description="URL slug (auto-generated if not provided)",
        example="technology",
    )
    description: str | None = Field(
        None,
        max_length=500,
        description="Category description",
        example="Latest technology news and trends",
    )
    data: str | None = Field(
        None,
        description="Additional metadata as JSON string",
        example='{"extra": "data"}',
    )
    image: str | None = Field(
        None, description="Category image URL", example="https://example.com/tech.jpg"
    )
    parent: int | None = Field(
        None, description="Parent category ID (0 for top-level)", example=0
    )
    locale: str | None = Field(None, description="Category locale", example="en")
    status: int | None = Field(
        None, description="Category status (1=active, 0=inactive)", example=1
    )
    icon: str | None = Field(None, description="FontAwesome icon key", example="house")
    color: str | None = Field(
        None, description="Category color in hex format", example="#10b981"
    )


class CategoryResponse(BaseModel):
    """Response model for category data"""

    id: int = Field(description="Category ID", example=1)
    title: str = Field(description="Category title", example="Technology")
    url: str = Field(description="URL slug", example="technology")
    description: str | None = Field(None, description="Category description")
    data: str | None = Field(None, description="Additional metadata as JSON string")
    image: str | None = Field(None, description="Category image URL")
    parent: int | None = Field(None, description="Parent category ID")
    locale: str | None = Field(None, description="Category locale")
    status: int = Field(description="Category status", example=1)
    created: int | None = Field(None, description="Creation timestamp")
    updated: int | None = Field(None, description="Last update timestamp")
    user: int | None = Field(None, description="Creator user ID")
    icon: str | None = Field(None, description="FontAwesome icon key", example="house")
    color: str | None = Field(
        None, description="Category color in hex format", example="#10b981"
    )


@router.post("/save/", response_model=CategoryResponse, tags=["Categories"])
async def save_category(
    request: Request,
    data: CategorySaveRequest = Body(...),
):
    """Create or update a category"""

    # No access
    # FIXME: turn on
    # if request.state.status < 5:
    #     raise ErrorAccess("save category")

    new = False
    tracked_fields = {
        "id",
        "title",
        "url",
        "description",
        "data",
        "image",
        "parent",
        "locale",
        "status",
        "icon",
        "color",
        "user",
    }

    if data.id:
        category = Category.get(data.id)

        if (
            request.state.status < 6
            and (not category.user or category.user != request.state.user)
            and category.token != request.state.token
        ):
            raise ErrorAccess("save")

    else:
        if not data.title:
            raise ErrorWrong("title")

        category = Category(
            user=request.state.user,
            token=None if request.state.user else request.state.token,
        )

        new = True

    if data.title is not None:
        category.title = data.title
    if data.description is not None:
        category.description = data.description
    if data.data is not None:
        category.data = data.data
    if data.image is not None:
        category.image = data.image
    if data.parent is not None:
        category.parent = data.parent
    if data.status is not None:
        category.status = data.status
    if data.icon is not None:
        category.icon = data.icon
    if data.color is not None:
        category.color = data.color

    if data.url is not None:
        category.url = data.url
    elif data.title is not None:
        category.url = to_url(data.title)

    if data.locale is not None:
        if data.locale:
            category.locale = data.locale
        else:
            # Explicitly clear locale when empty/none passed (worldwide)
            del category.locale

    if category.url and category.url[-1].isdigit():
        category.url += "-x"

    if new:
        url_exists = Category.count(url=category.url)
    else:
        url_exists = Category.count(id={"$ne": category.id}, url=category.url)

    if not category.url or url_exists:
        category.url = str(category.created)[-6:] + "-" + (category.url or "x")

    changes = format_changes(category.get_changes())
    category.save()

    cache_categories()

    Track.log(
        object=TrackObject.CATEGORY,
        action=TrackAction.CREATE if new else TrackAction.UPDATE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": category.id,
            "changes": changes,
        },
    )

    log.success(
        ("Created" if new else "Updated") + " category\n{}",
        {
            "category": category.id,
            "title": category.title,
            "locale": category.locale,
            "user": request.state.user,
        },
    )

    return CategoryResponse(
        id=category.id,
        title=category.title,
        url=category.url,
        description=category.description,
        data=category.data,
        image=category.image,
        parent=category.parent,
        locale=category.locale,
        status=category.status,
        created=category.created,
        updated=category.updated,
        user=category.user,
        icon=category.icon,
        color=category.color,
    )

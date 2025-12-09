"""
Aggregated statistics for the admin dashboard.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess

from lib import report
from models.post import Post
from models.product import Product
from models.user import UserLocal


router = APIRouter()


class AdminStatsRequest(BaseModel):
    """Reserved payload for future filters."""

    includeDrafts: bool | None = Field(
        default=None,
        description="Placeholder flag for draft data; currently ignored.",
        example=False,
    )


class AdminStatsResponse(BaseModel):
    users: int = Field(..., description="Total registered users", example=1234)
    posts: int = Field(..., description="Total posts", example=847)
    products: int = Field(..., description="Total products", example=96)


async def _get_users_count() -> int:
    """
    Return total users from the core service with graceful fallbacks.
    """

    # try:
    #     users = await complex_global_users(limit=None, offset=None, fields=["id"])
    # except Exception as exc:  # pylint: disable=broad-except
    #     await report.warning("User count fallback (core)", error=exc)
    # else:
    #     if isinstance(users, list):
    #         return len(users)
    #     if users:
    #         return 1
    #     return 0

    try:
        return UserLocal.count()
    except Exception as exc:  # pylint: disable=broad-except
        await report.warning("User count fallback (local)", error=exc)
        return 0


@router.post("/stats/", response_model=AdminStatsResponse, tags=["admin"])
async def handler(
    request: Request,
    data: AdminStatsRequest = Body(default_factory=AdminStatsRequest),
):
    """Return aggregated counters for the admin dashboard."""

    if request.state.status < 6:
        raise ErrorAccess("stats")

    _ = data.includeDrafts  # Reserved for future filtering

    try:
        posts_count = Post.count()
    except Exception as exc:  # pylint: disable=broad-except
        await report.warning("Posts count failed", error=exc)
        posts_count = 0

    try:
        products_count = Product.count()
    except Exception as exc:  # pylint: disable=broad-except
        await report.warning("Products count failed", error=exc)
        products_count = 0

    users_count = await _get_users_count()

    return {
        "users": users_count,
        "posts": posts_count,
        "products": products_count,
    }

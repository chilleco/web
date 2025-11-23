"""
The removal method of the review object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from models.review import Review


router = APIRouter()


class Type(BaseModel):
    id: int


@router.post("/rm/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Delete"""

    # No access
    if request.state.status < 5:
        raise ErrorAccess("rm")

    # Get
    review = Review.get(data.id)

    # Delete
    review.rm()

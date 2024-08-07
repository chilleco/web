"""
The creating and editing method of the review object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel

from models.review import Review
from lib import report


router = APIRouter()


class Type(BaseModel):
    id: int | None = None
    title: str | None = None
    data: str | None = None


@router.post("/save/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Save"""

    # Get

    new = False

    if data.id:
        review = Review.get(data.id, fields={})
    else:
        review = Review(
            user=request.state.user,
            token=request.state.token,
        )
        new = True

    # Change fields
    review.title = data.title  # TODO: checking if add
    review.data = data.data  # TODO: checking if add

    # Save
    review.save()

    # Report
    await report.request(
        "New review",
        {
            "review": review.id,
            "title": review.title,
            "data": review.data,
            "user": request.state.user,
            "token": request.state.token,
        },
    )

    # Processing
    cont = None
    if data.data and data.data != review.data:
        cont = review.data

    # Response
    return {
        "id": review.id,
        "data": cont,
        "new": new,
    }

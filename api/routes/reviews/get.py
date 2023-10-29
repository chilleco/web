"""
The getting method of the review object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

# from models.user import User
from models.review import Review


router = APIRouter()


class Type(BaseModel):
    id: int | list[int] = None
    limit: int = None
    offset: int = None
    search: str = None
    # TODO: fields: list[str] = None

@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Get """

    # TODO: get by your token when you unauth

    # No access
    if request.state.status < 4:
        raise ErrorAccess('get')

    # Fields
    fields = {
        'id',
        'title',
        'data',
        'user',
        'created',
        'network',
    }

    # Processing
    def handle(review):
        # User info
        # FIXME: get via core API
        # if review.get('user'):
        #     review['user'] = User.complex(review['user'], fields={
        #         'id',
        #         'login',
        #         'name',
        #         'surname',
        #         'image',
        #     })

        return review

    # Get
    reviews = Review.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        search=data.search,
        fields=fields,
        handler=handle,
    )

    # Response
    return {
        'reviews': reviews,
    }

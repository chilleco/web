"""
The blocking method of the user object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess

from models.user import User


router = APIRouter()


class Type(BaseModel):
    id: int

@router.post("/block/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Block """

    # Get user
    subuser = User.get(data.id, fields={'status'})

    # No access
    if request.state.status < 6 or subuser.status > request.state.status:
        raise ErrorAccess('block')

    # Save
    subuser.status = 1
    subuser.save()

    # Response
    return {
        'status': subuser.status,
    }

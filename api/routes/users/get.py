"""
The getting method of the user object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess, ErrorInvalid

from models.user import User
from models.socket import Socket


router = APIRouter()


def online_back(user_id):
    """Checking how long has been online"""

    sockets = Socket.get(user=user_id, fields={})

    if sockets:
        return 0

    # FIXME: get via core API
    # user = User.get(user_id, fields={'last_online'})

    # if not user.last_online:
    #     return 0

    # return int(time.time() - user.last_online)
    return 0


class Type(BaseModel):
    id: int | list[int] | None = None
    limit: int | None = None
    offset: int | None = None
    fields: list[str] | None = None


@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    # Checks
    if request.state.status < 4 and data.id != request.state.user:  # TODO: 5
        raise ErrorAccess("get")
    if request.state.user == 0:
        raise ErrorInvalid("id")

    # UserHub
    users = await User.complex(
        token=request.state.token,
        id=data.id,
        limit=data.limit,
        offset=data.offset,
        fields=data.fields,
    )

    if isinstance(users, str):
        raise ErrorInvalid("res")

    # Response
    return {
        "users": users,
    }

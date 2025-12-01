"""
The getting method of the user object of the API
"""

from typing import Any

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess, ErrorInvalid

from models.user import User, UserLocal, DEFAULT_BALANCE
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


def merge_local_data(user: dict[str, Any], local_data: dict[str, Any]):
    """Apply only meaningful local values on top of the global user payload."""
    user.update({key: value for key, value in local_data.items() if value is not None})


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
    elif isinstance(users, dict):
        user_ids = {users["id"]}
    else:
        user_ids = {user["id"] for user in users}

    users_local = UserLocal.complex(list(user_ids))
    user_local_ids = {user["id"] for user in users_local}

    for user_id in user_ids - user_local_ids:
        user_local = UserLocal(
            id=user_id,
            balance=DEFAULT_BALANCE,
            spaces=[],
            # TODO: social
        )
        user_local.save()
        users_local.append(user_local.json())

    users_local = {user["id"]: user for user in users_local}

    if isinstance(users, dict):
        if users_local[users["id"]].get("spaces") is None:
            users_local[users["id"]]["spaces"] = []
        merge_local_data(users, users_local[users["id"]])
    else:
        for user in users:
            if users_local[user["id"]].get("spaces") is None:
                users_local[user["id"]]["spaces"] = []
            merge_local_data(user, users_local[user["id"]])

    # Response
    return {
        "users": users,
    }

"""
The getting method of the user object of the API
"""

# import time

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorAccess, ErrorInvalid

# from models.user import User
from models.socket import Socket


router = APIRouter()


def online_back(user_id):
    """ Checking how long has been online """

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
    id: int | list[int] = None
    limit: int = None
    offset: int = None
    fields: list[str] = None

@router.post("/get/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Get """

    # FIXME: get via core API
    # TODO: cursor

    # Checks

    if request.state.status < 4 and data.id != request.state.user: # TODO: 5
        raise ErrorAccess('get')

    if request.state.user == 0:
        raise ErrorInvalid('id')

    # TODO: Get myself
    # if not data.id and request.state.user:
    #     data.id = request.state.user

    # # Fields
    # # TODO: right to roles

    # fields = {
    #     'id',
    #     'login',
    #     'image',
    #     'name',
    #     'surname',
    #     'title',
    #     'status',
    #     # 'subscription',
    #     # 'balance',
    #     'rating',
    #     'description',
    #     'discount',
    # }

    # process_self = data.id == request.state.user
    # process_admin = request.state.status >= 7

    # if process_self:
    #     fields |= {
    #         'phone',
    #         'mail',
    #         'social',
    #         'subscription',
    #         'pay',
    #     }

    # if process_admin:
    #     fields |= {
    #         'phone',
    #         'mail',
    #         'social',
    #         'subscription',
    #         'pay',
    #     }

    # if data.fields:
    #     fields = fields & set(data.fields) | {'id'}

    # # Processing
    # def handle(user):
    #     if data.fields and 'online' in data.fields:
    #         user['online'] = online_back(user['id'])

    #     return user

    # # Get
    # users = User.complex(
    #     ids=data.id,
    #     limit=data.limit,
    #     offset=data.offset,
    #     fields=fields,
    #     handler=handle,
    # )

    users = []

    # Response
    return {
        'users': users,
    }

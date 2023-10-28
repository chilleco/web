"""
The authorization method of the account object of the API
"""

import jwt
from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from userhub import auth, detect_type

from lib import cfg


USER_FIELDS = {
    'id',
    'login',
    'image',
    'name',
    'surname',
    'title',
    'phone',
    'mail',
    'social',
    'status',
    # 'subscription',
    # 'balance',
}


router = APIRouter()


async def wrap_auth(*args, **kwargs):
    kwargs['project'] = cfg('PROJECT_NAME')
    user, token_id, new = await auth(*args, **kwargs)

    # JWT
    token = jwt.encode({
        'token': token_id,
        'user': user['id'],
        'network': kwargs['network'],
        # 'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
    }, cfg('jwt'), algorithm='HS256')

    # Response
    response = JSONResponse(content={
        **user,
        'new': new,
        'token': token,
    })
    response.set_cookie(key="Authorization", value=f"Bearer {token}")
    return response


class Type(BaseModel):
    login: str # login / mail / phone
    password: str
    name: str = None
    surname: str = None
    image: str = None
    mail: str = None
    utm: str = None

@router.post("/auth/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Sign in / Sign up """
    by = detect_type(data.login)
    return await wrap_auth(
        by,
        request.state.token,
        network=request.state.network,
        ip=request.state.ip,
        locale=request.state.locale,
        login=data.login,
        password=data.password,
        name=data.name,
        surname=data.surname,
        image=data.image,
        mail=data.mail,
        utm=data.utm,
        online=True,
        check_password=True,
    )

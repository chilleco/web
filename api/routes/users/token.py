"""
The token creating method of the user object of the API
"""

import jwt
from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from userhub import token
from libdev.codes import get_network

from lib import cfg


router = APIRouter()


class Type(BaseModel):
    token: str
    network: str
    utm: str | None = None
    extra: dict | None = None


@router.post("/token/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Create token"""

    token_id, user_id, status = await token(
        cfg("PROJECT_NAME"),
        data.token,
        network=data.network,
        utm=data.utm,
        extra=data.extra,
        ip=request.state.ip,
        locale=request.state.locale,
        user_agent=request.state.user_agent,
    )

    # JWT
    token_jwt = jwt.encode(
        {
            "token": token_id,
            "user": user_id,
            "status": status,
            "network": get_network(data.network),
            # 'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        },
        cfg("jwt"),
        algorithm="HS256",
    )

    # Response
    response = JSONResponse(
        content={
            "token": token_jwt,
        }
    )
    response.set_cookie(key="Authorization", value=f"Bearer {token_jwt}")
    return response

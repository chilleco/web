"""
The authorization via social networks method of the account object of the API
"""

import json
import urllib

import jwt
import requests
from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from libdev.codes import get_network
from consys.errors import ErrorAccess, ErrorWrong

from routes.account.auth import wrap_auth
from lib import cfg, report


router = APIRouter()


def auth_telegram(data):
    """Authorization via Telegram"""
    user = jwt.decode(data.code, cfg("jwt"), algorithms="HS256")["user"]
    return (
        user.get("login"),
        user.get("user"),
        user.get("name"),
        user.get("surname"),
        user.get("image"),
        user.get("mail"),
    )


def auth_google(data):
    """Authorization via Google"""

    link = "https://accounts.google.com/o/oauth2/token"
    cont = {
        "client_id": cfg("google.id"),
        "client_secret": cfg("google.secret"),
        "redirect_uri": f"{cfg('web')}callback",
        "grant_type": "authorization_code",
        "code": urllib.parse.unquote(data.code),
    }
    response = json.loads(requests.post(link, json=cont, timeout=10).text)

    if "access_token" not in response:
        raise ErrorAccess("code")

    link = "https://www.googleapis.com/oauth2/v1/userinfo?access_token={}"
    response = json.loads(
        requests.get(link.format(response["access_token"]), timeout=10).text
    )

    if "id" not in response:
        raise ErrorAccess("code")

    user = response["id"]
    name = response.get("given_name")
    surname = response.get("family_name")
    mail = response.get("email")
    image = response.get("picture") or None

    return None, user, name, surname, image, mail


class Type(BaseModel):
    social: str | int
    code: str


@router.post("/social/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Via social network"""

    # TODO: actions
    # TODO: image
    # TODO: the same token
    # TODO: Сшивать профили, если уже есть с такой почтой / ...

    # Preparing params
    social = get_network(data.social)

    # TODO: VK
    if social == 2:
        login, user, name, surname, image, mail = auth_telegram(data)
    elif social == 4:
        login, user, name, surname, image, mail = auth_google(data)

    # Wrong ID
    if not user:
        await report.error(
            "Wrong ID",
            {
                "social": social,
                "social_user": user,
            },
        )
        raise ErrorWrong("id")

    return await wrap_auth(
        "social",
        request.state.token,
        network=request.state.network,
        ip=request.state.ip,
        locale=request.state.locale,
        login=login,
        social=social,
        user=user,
        name=name,
        surname=surname,
        image=image,
        mail=mail,
        # utm=utm,
        online=True,
    )

"""
The authorization method of the user object of the API
"""

import jwt
from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from userhub import auth, detect_type
from consys.errors import ErrorInvalid, ErrorWrong
from libdev.crypt import decrypt, encrypt

from lib import cfg, log, report
from models.track import Track, TrackAction, TrackObject, _resolve_source
from models.user import (
    DEFAULT_BALANCE,
    UserLocal,
    complex_global_users,
    get_name,
    get_social,
)


USER_FIELDS = {
    "id",
    "login",
    "image",
    "name",
    "surname",
    "title",
    "phone",
    "mail",
    "social",
    "status",
    "balance",
}


router = APIRouter()


def get_user(global_user, **kwargs):
    if not global_user:
        raise ErrorInvalid("user_id")

    social = get_social(global_user, 2) or {}

    if not global_user["id"]:
        raise ErrorInvalid("user_id")

    new = False
    try:
        user = UserLocal.get(global_user["id"])
    except ErrorWrong:
        user = UserLocal(
            id=global_user["id"],
            balance=DEFAULT_BALANCE,
            social_user=social.get("id"),
            locale=kwargs.get("locale"),
            spaces=[],
        )
        user.save()
        if not user.link:
            user.link = encrypt(user.id, 8)
            user.save()
        new = True
    else:
        if user.spaces is None:
            user.spaces = []
            user.save()
        if not user.link:
            user.link = encrypt(user.id, 8)
            user.save()
        if user.locale and kwargs.get("locale") and user.locale != kwargs["locale"]:
            user.locale = kwargs["locale"]
            user.save()

    return user, new


async def update_utm(user, global_user, utm):
    if not utm:
        return user, None, None

    try:
        referrer_id = decrypt(utm)
    except Exception:  # pylint: disable=broad-except
        referrer_id = None

    global_referrer = None
    if isinstance(referrer_id, int) and referrer_id > 0:
        try:
            global_referrer = await complex_global_users(
                ids=referrer_id,
                fields=USER_FIELDS,
            )
        except Exception:  # pylint: disable=broad-except
            global_referrer = None

    if not global_referrer:
        if user.utm:
            return user, None, None

        user.utm = utm
        user.save()
        return user, None, None

    referrer, _ = get_user(global_referrer)
    log.info(f"referrer #{referrer.id}")

    if referrer.id == user.id:
        return user, None, None

    if user.referrer is None:
        user.referrer = referrer.id

    if referrer.id not in user.frens:
        user.frens.append(referrer.id)
    user.save()

    if user.id not in referrer.frens:
        referrer.frens.append(user.id)
        referrer.save()

    return user, referrer, global_referrer


async def wrap_auth(*args, **kwargs):
    """Unified auth wrapper"""

    user, token_id, new_global = await auth(cfg("PROJECT_NAME"), *args, **kwargs)

    if not user:
        raise ErrorWrong("password")

    local_user, new_local = get_user(user, **kwargs)
    local_status = local_user["status"]
    if local_status is not None:
        user["status"] = local_status
    user["roles"] = local_user.roles
    for key, value in local_user.json().items():
        if value is not None:
            user[key] = value

    global_referrer = None
    if kwargs.get("utm"):
        _, _, global_referrer = await update_utm(local_user, user, kwargs["utm"])

    token = jwt.encode(
        {
            "token": token_id,
            "user": user["id"],
            "status": user["status"],
            "network": kwargs["network"],
        },
        cfg("jwt"),
        algorithm="HS256",
    )

    if new_local:
        social = get_social(user, 2) or {}
        try:
            locale = user.get("locale") or social.get("locale")

            await report.important(
                "User registration",
                {
                    "social": social.get("id"),
                    "locale": locale if locale and locale != "en" else None,
                    "user": get_name(user),
                    "referrer": global_referrer and get_name(global_referrer),
                    "utm": kwargs.get("utm") if not global_referrer else None,
                },
            )
        except Exception as e:  # pylint: disable=broad-except
            print(e)

    Track.log(
        object=TrackObject.USER,
        action=TrackAction.CREATE if new_local else TrackAction.UPDATE,
        user=user["id"],
        token=token_id,
        context={
            "source": _resolve_source(kwargs.get("network")),
            "network": kwargs.get("network"),
            "ip": kwargs.get("ip"),
            "locale": kwargs.get("locale"),
        },
        params={
            "login": kwargs.get("login"),
            "name": kwargs.get("name"),
            "surname": kwargs.get("surname"),
            "utm": kwargs.get("utm"),
            "new": new_local,
            "status": user.get("status"),
            "roles": user.get("roles"),
            "referrer": global_referrer and get_name(global_referrer),
        },
    )

    response = JSONResponse(
        content={
            **user,
            "new": new_local,
            "token": token,
        }
    )
    response.set_cookie(key="Authorization", value=f"Bearer {token}")
    return response


class Type(BaseModel):
    login: str  # login / mail / phone
    password: str
    name: str | None = None
    surname: str | None = None
    image: str | None = None
    mail: str | None = None
    utm: str | None = None


@router.post("/auth/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """Sign in / Sign up"""
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

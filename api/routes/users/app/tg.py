"""
The authorization via TG mini app method of the user object of the API
"""

import hashlib
import hmac
import json
from urllib.parse import unquote

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorWrong, ErrorInvalid

from lib import cfg
from routes.users.auth import wrap_auth


router = APIRouter()


def verify_telegram_web_app_data(telegram_init_data: str) -> tuple[bool, dict]:
    if not telegram_init_data:
        return False, {}

    telegram_init_data_unquote = unquote(telegram_init_data)
    init_data = dict(qc.split("=") for qc in telegram_init_data_unquote.split("&"))
    hash_value = init_data.pop("hash", None)
    data_to_check = "\n".join(
        f"{key}={init_data[key]}" for key in sorted(init_data.keys()) if key != "hash"
    )

    secret_key_stage1 = hmac.new(
        key=bytes("WebAppData", "utf-8"),
        msg=bytes(cfg("tg.token"), "utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    computed_hash = hmac.new(
        key=secret_key_stage1,
        msg=bytes(data_to_check, "utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return computed_hash == hash_value, init_data


class Type(BaseModel):
    url: str
    # TODO: referral: str | None = None
    utm: str | None = None


@router.post("/tg/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    verified, init_data = verify_telegram_web_app_data(data.url)
    if not verified:
        raise ErrorInvalid("url")

    data_user = json.loads(init_data.get("user", ""))
    if not data_user.get("id"):
        raise ErrorWrong("url")

    return await wrap_auth(
        "app",
        request.state.token,
        network=request.state.network,
        ip=request.state.ip,
        locale=data_user.get("language_code") or None,  # request.state.locale,
        login=data_user.get("username") or None,
        social=2,
        user=int(data_user["id"]),
        name=data_user.get("first_name") or None,
        surname=data_user.get("last_name") or None,
        image=data_user.get("photo_url") or None,  # TODO: download
        utm=data.utm,
        # TODO: premium=data_user.get("is_premium") or False,
        # TODO: mailing=data_user.get("allows_write_to_pm") or False,
    )

    # TODO: Update
    # if (
    #     user.login != login
    #     or user.name != name
    #     or user.surname != surname
    #     or user.locale != locale
    #     or user.premium != premium
    #     or user.mailing != mailing
    # ):
    #     user.login = login
    #     user.name = name
    #     user.surname = surname
    #     user.locale = locale
    #     user.premium = premium
    #     user.mailing = mailing
    #     user.save()

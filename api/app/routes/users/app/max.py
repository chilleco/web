"""
The authorization via MAX mini app method of the user object of the API
"""

import hashlib
import hmac
import json
from urllib.parse import unquote

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorWrong, ErrorInvalid

from lib import cfg, report
from routes.users.auth import wrap_auth


router = APIRouter()


async def verify_max_web_app_data(init_data_raw: str) -> tuple[bool, dict]:
    if not init_data_raw:
        return False, {}

    try:
        init_data_unquote = unquote(init_data_raw)
        init_data = dict(qc.split("=") for qc in init_data_unquote.split("&"))
        hash_value = init_data.pop("hash", None)
        data_to_check = "\n".join(
            f"{key}={init_data[key]}"
            for key in sorted(init_data.keys())
            if key != "hash"
        )
    except ValueError:
        await report.error("MAX auth data", {"data": init_data_raw})
        return False, {}

    secret_key = hmac.new(
        key=bytes("WebAppData", "utf-8"),
        msg=bytes(cfg("max.token"), "utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    computed_hash = hmac.new(
        key=secret_key,
        msg=bytes(data_to_check, "utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return computed_hash == hash_value, init_data


class Type(BaseModel):
    url: str
    utm: str | None = None


@router.post("/max/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    verified, init_data = await verify_max_web_app_data(data.url)
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
        locale=data_user.get("language_code") or None,
        login=data_user.get("username") or None,
        social=9,
        user=int(data_user["id"]),
        name=data_user.get("first_name") or None,
        surname=data_user.get("last_name") or None,
        image=data_user.get("photo_url") or None,
        utm=data.utm,
    )

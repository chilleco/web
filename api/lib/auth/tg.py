import hashlib
import hmac
import json
from urllib.parse import unquote  # urlparse, parse_qsl, urlencode

from libdev.cfg import cfg
from consys.errors import ErrorInvalid
from userhub import auth


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


async def parse_token(request, token):
    verified, init_data = verify_telegram_web_app_data(token)

    data = json.loads(init_data.get("user", ""))
    if not data.get("id"):
        return False, {}

    # TODO: save token in cookies
    user, _, new = await auth(
        cfg("PROJECT_NAME"),
        "app",
        request.state.token,
        network=request.state.network,
        ip=request.state.ip,
        locale=data.get("language_code") or None,  # request.state.locale,
        login=data.get("username") or None,
        social=2,
        user=data["id"],
        name=data.get("first_name") or None,
        surname=data.get("last_name") or None,
        image=data.image,
        mail=data.mail,
        utm=data.utm,
        # TODO: premium=data.get("is_premium") or False,
        # TODO: mailing=data.get("allows_write_to_pm") or False,
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

    return verified, user, new


async def tg_auth(request, token):
    verified, user, _ = await parse_token(request, token)
    if not verified:
        raise ErrorInvalid("token")
    return (
        token,  # token["token"]
        user.id,  # token.get("user", 0)
        3,  # token.get("status", 3)
        2,  # token.get("network", 0)
    )

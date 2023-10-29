"""
The authorization via mini app method of the account object of the API
"""

import hashlib
from collections import OrderedDict
from base64 import b64encode
from hmac import HMAC
from urllib.parse import urlparse, parse_qsl, urlencode

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel
from consys.errors import ErrorWrong, ErrorInvalid

from routes.account.auth import wrap_auth
from lib import cfg, report


router = APIRouter()


def is_valid_vk(*, query: dict) -> bool:
    """ Check url """

    vk_subset = OrderedDict(sorted(
        x for x in query.items() if x[0][:3] == 'vk_'
    ))
    hash_code = b64encode(HMAC(
        cfg('vk.secret').encode(),
        urlencode(vk_subset, doseq=True).encode(),
        hashlib.sha256
    ).digest())
    decoded_hash_code = hash_code.decode('utf-8')[:-1] \
                                 .replace('+', '-') \
                                 .replace('/', '_')

    return query['sign'] == decoded_hash_code

class Type(BaseModel):
    url: str
    referral: str = None
    login: str = None
    name: str = None
    surname: str = None
    image: str = None
    mail: str = None
    utm: str = None

@router.post("/app/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """ Mini app auth """

    try:
        params = dict(parse_qsl(
            urlparse(data.url).query,
            keep_blank_values=True,
        ))
        data_user = int(params['vk_user_id'])
        status = is_valid_vk(query=params)
    except Exception as e:
        await report.warning("Failed authorization attempt in the app", {
            'url': data.url,
            'user': request.state.user,
            'network': request.state.network,
            'error': e,
        })
        raise ErrorInvalid('url') from e

    if not status:
        raise ErrorWrong('url')

    return await wrap_auth(
        'app',
        request.state.token,
        network=request.state.network,
        ip=request.state.ip,
        locale=request.state.locale,
        login=data.login,
        social=3,
        user=data_user,
        name=data.name,
        surname=data.surname,
        image=data.image,
        mail=data.mail,
        utm=data.utm,
    )

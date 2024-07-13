"""
The authorization via social networks method of the account object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel

from routes.account.auth import wrap_auth


router = APIRouter()


class Type(BaseModel):
    user: int
    login: str | None = None
    name: str | None = None
    surname: str | None = None
    image: str | None = None
    utm: str | None = None


@router.post("/bot/")
async def handler(
    request: Request,
    data: Type = Body(...),
):
    """By bot"""
    return await wrap_auth(
        "bot",
        request.state.token,
        network=request.state.network,
        ip=request.state.ip,
        locale=request.state.locale,
        login=data.login,
        user=data.social,
        name=data.name,
        surname=data.surname,
        image=data.image,
        utm=data.utm,
    )

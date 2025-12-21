"""
Referral friends (frens) list endpoint.
"""

from typing import Literal

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess, ErrorWrong
from libdev.crypt import encrypt

from models.user import DEFAULT_BALANCE, UserLocal, fetch_user_profiles


router = APIRouter()


class FrensRequest(BaseModel):
    limit: int | None = Field(
        None,
        ge=1,
        le=500,
        description="Maximum number of friends to return",
        examples=[50],
    )
    offset: int | None = Field(
        None,
        ge=0,
        description="Number of friends to skip before returning results",
        examples=[0],
    )


FrenRelation = Literal["referral", "referrer", "friend"]


class FrenItem(BaseModel):
    id: int = Field(..., description="User id", examples=[42])
    login: str | None = Field(None, description="Login handle", examples=["jdoe"])
    name: str | None = Field(None, description="First name", examples=["John"])
    surname: str | None = Field(None, description="Last name", examples=["Doe"])
    title: str | None = Field(None, description="Display name/title", examples=["John Doe"])
    image: str | None = Field(None, description="Avatar image URL", examples=["https://cdn.example.com/avatar.png"])
    balance: int | None = Field(None, description="Coin balance", examples=[1500])
    relation: FrenRelation = Field(
        ...,
        description="Relation to current user",
        examples=["referral"],
    )


class FrensResponse(BaseModel):
    frens: list[FrenItem] = Field(..., description="Friends list sorted by balance")
    count: int = Field(..., description="Total friends count", examples=[3])
    referral_link: str | None = Field(
        None,
        description="Encoded referral link key",
        examples=["aB12cD34"],
    )
    referral_code: int | None = Field(
        None,
        description="Legacy referral code (social id when available)",
        examples=[123456789],
    )


@router.post("/frens/", response_model=FrensResponse)
async def handler(
    request: Request,
    data: FrensRequest = Body(...),
):
    if request.state.status < 3 or not request.state.user:
        raise ErrorAccess("frens")

    try:
        user = UserLocal.get(request.state.user)
    except ErrorWrong:
        user = UserLocal(
            id=request.state.user,
            balance=DEFAULT_BALANCE,
            spaces=[],
        )
        user.save()

    if not user.link:
        user.link = encrypt(user.id, 8)
        user.save()

    fren_ids = {int(value) for value in (user.frens or []) if value}
    if not fren_ids:
        return {
            "frens": [],
            "count": 0,
            "referral_link": user.link,
            "referral_code": user.social,
        }

    profiles = await fetch_user_profiles(
        fren_ids,
        global_fields={"id", "login", "name", "surname", "title", "image"},
        local_fields={"id", "login", "name", "surname", "image", "balance", "referrer"},
    )

    current_referrer = user.referrer
    frens: list[dict[str, object]] = []
    for fren_id in sorted(fren_ids):
        profile = profiles.get(fren_id)
        if not profile:
            continue

        relation: FrenRelation = "friend"
        if current_referrer and fren_id == current_referrer:
            relation = "referrer"
        else:
            referrer_id = profile.get("referrer")
            if isinstance(referrer_id, int) and referrer_id == user.id:
                relation = "referral"

        balance = profile.get("balance")
        frens.append(
            {
                "id": fren_id,
                "login": profile.get("login"),
                "name": profile.get("name"),
                "surname": profile.get("surname"),
                "title": profile.get("title"),
                "image": profile.get("image"),
                "balance": int(balance) if isinstance(balance, (int, float)) else None,
                "relation": relation,
            }
        )

    frens.sort(key=lambda item: (item.get("balance") or 0, item.get("id") or 0), reverse=True)
    total = len(fren_ids)

    offset = data.offset or 0
    limit = data.limit
    if offset:
        frens = frens[offset:]
    if limit is not None:
        frens = frens[:limit]

    return {
        "frens": frens,
        "count": total,
        "referral_link": user.link,
        "referral_code": user.social,
    }

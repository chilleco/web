"""
Create or update space entity.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict
from libdev.crypt import encrypt
from consys.errors import ErrorAccess, ErrorWrong

from models.space import Space
from models.track import Track, TrackAction, TrackObject, format_changes
from .get import SpaceResponse, serialize_space
from .utils import attach_user_to_space


router = APIRouter()


class SpaceSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int | None = Field(None, description="Space id for updating", example=3)
    link: str | None = Field(None, description="Space link for updating", example="a1b2c")
    # Allow passing id when only link is known on the FE
    space_id: int | None = Field(None, description="Space id alias", example=3)
    title: str | None = Field(None, description="Space title", example="Partner network")
    logo: str | None = Field(None, description="Logo URL", example="https://example.com/logo.png")
    description: str | None = Field(None, description="Description", example="Regional partners")
    entity: str | None = Field(
        None,
        description="Entity type (ooo, ip, fl, smz)",
        example="ooo",
    )
    director: str | None = Field(None, description="Director full name", example="John Doe")
    inn: str | None = Field(None, description="Tax id / INN", example="7701234567")
    margin: float | None = Field(
        None,
        ge=0,
        description="Extra margin percent for prices",
        example=10.5,
    )
    phone: str | None = Field(None, description="Phone", example="+19998887766")
    mail: str | None = Field(None, description="Email", example="team@example.com")
    telegram: str | None = Field(
        None,
        description="Telegram account link",
        example="https://t.me/company",
    )
    country: str | None = Field(None, description="Country", example="USA")
    region: str | None = Field(None, description="Region", example="CA")
    city: str | None = Field(None, description="City", example="San Francisco")
    status: int | None = Field(None, description="Visibility status", example=1)


class SpaceSaveResponse(BaseModel):
    id: int
    new: bool
    space: SpaceResponse


def _get_space_for_update(data: SpaceSaveRequest) -> Space:
    target_id = data.id or data.space_id
    if target_id:
        return Space.get(target_id)
    if data.link:
        return Space.get(link=data.link)
    raise ErrorWrong("space")


def _apply_space_fields(space: Space, data: SpaceSaveRequest) -> None:
    if data.title is not None:
        space.title = data.title
    if data.logo is not None:
        space.logo = data.logo
    if data.description is not None:
        space.description = data.description
    if data.entity is not None:
        space.entity = data.entity
    if data.director is not None:
        space.director = data.director
    if data.inn is not None:
        space.inn = data.inn
    if data.margin is not None:
        space.margin = float(data.margin)
    if data.phone is not None:
        space.phone = data.phone
    if data.mail is not None:
        space.mail = data.mail
    if data.telegram is not None:
        space.telegram = data.telegram
    if data.country is not None:
        space.country = data.country
    if data.region is not None:
        space.region = data.region
    if data.city is not None:
        space.city = data.city
    if data.status is not None:
        space.status = data.status


@router.post("/save/", response_model=SpaceSaveResponse)
async def handler(request: Request, data: SpaceSaveRequest = Body(...)):
    """Create or update a space."""

    if request.state.status < 2 or not request.state.user:
        raise ErrorAccess("save")

    new = False
    tracked_fields = {
        "id",
        "title",
        "logo",
        "description",
        "entity",
        "director",
        "inn",
        "margin",
        "phone",
        "mail",
        "telegram",
        "country",
        "region",
        "city",
        "status",
        "link",
        "users",
    }
    before_state = None

    if data.id or data.link:
        space = _get_space_for_update(data)
        if request.state.status < 4 and request.state.user not in (space.users or []):
            raise ErrorAccess("save")
        before_state = space.json(fields=tracked_fields)
    else:
        if data.title is None:
            raise ErrorWrong("title")
        space = Space(
            title=data.title,
            logo=data.logo,
            description=data.description or "",
            entity=data.entity,
            director=data.director,
            inn=data.inn,
            margin=float(data.margin or 0),
            phone=data.phone,
            mail=data.mail,
            telegram=data.telegram,
            country=data.country,
            region=data.region,
            city=data.city,
            users=[request.state.user],
            user=request.state.user,
            token=request.state.token,
            status=data.status if data.status is not None else 1,
        )
        new = True

    _apply_space_fields(space, data)

    changes = format_changes(space.get_changes())
    space.save()
    if not space.link:
        space.link = encrypt(space.id, 5)
        space.save()

    attach_user_to_space(space, request.state.user)

    Track.log(
        object=TrackObject.SPACE,
        action=TrackAction.CREATE if new else TrackAction.UPDATE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": space.id,
            "before": before_state,
            "after": space.json(fields=tracked_fields),
            "changes": changes,
        },
    )

    return {
        "id": space.id,
        "new": new,
        "space": serialize_space(space),
    }

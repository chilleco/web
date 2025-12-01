"""
Get spaces or attach by invite link.
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict
from consys.errors import ErrorAccess, ErrorWrong

from models.space import Space
from .utils import attach_user_to_space, _ensure_space_instance


router = APIRouter()


class SpaceResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int = Field(..., description="Space id", example=12)
    title: str = Field(..., description="Readable title", example="Retail partners")
    link: str = Field(..., description="Invite/attach link", example="a1b2c")
    logo: str | None = Field(None, description="Logo URL", example="https://example.com/logo.png")
    description: str | None = Field(None, description="Short description", example="Wholesale partners")
    entity: str | None = Field(None, description="Entity type", example="ooo")
    director: str | None = Field(None, description="Full name of director", example="John Doe")
    inn: str | None = Field(None, description="Tax id", example="7701234567")
    margin: float = Field(0.0, description="Extra margin percent", example=12.5)
    phone: str | None = Field(None, description="Contact phone", example="+19998887766")
    mail: str | None = Field(None, description="Contact email", example="team@example.com")
    telegram: str | None = Field(None, description="Telegram account link", example="https://t.me/company")
    country: str | None = Field(None, description="Country", example="USA")
    region: str | None = Field(None, description="Region/state", example="CA")
    city: str | None = Field(None, description="City", example="San Francisco")
    users: list[int] | None = Field(None, description="Attached users")
    user: int | None = Field(None, description="Owner id")
    created: int | None = Field(None, description="Created timestamp")
    updated: int | None = Field(None, description="Updated timestamp")


class SpacesGetRequest(BaseModel):
    id: int | list[int] | None = Field(
        None,
        description="Single id or list of ids to fetch",
        examples=[1, [1, 2, 3]],
    )
    link: str | None = Field(
        None,
        description="Attach link to fetch specific space",
        example="a1b2c",
    )
    attached: bool = Field(
        False,
        description="Return only spaces attached to current user",
        examples=[True],
    )
    search: str | None = Field(
        None,
        description="Search query applied to space title/description/location",
        example="retail",
    )
    limit: int | None = Field(None, ge=1, description="Limit for list results", example=20)
    offset: int | None = Field(None, ge=0, description="Offset for list results", example=0)
    attach: bool = Field(
        True,
        description="When fetching by link, auto-attach current user",
        examples=[True],
    )


class SpacesGetResponse(BaseModel):
    spaces: list[SpaceResponse]
    count: int | None = Field(None, description="Total count for pagination")


def serialize_space(space: Space | dict) -> SpaceResponse:
    data = space.json() if hasattr(space, "json") else space
    return SpaceResponse(
        id=data.get("id"),
        title=data.get("title"),
        link=data.get("link") or "",
        logo=data.get("logo"),
        description=data.get("description"),
        entity=data.get("entity"),
        director=data.get("director"),
        inn=data.get("inn"),
        margin=float(data.get("margin") or 0),
        phone=data.get("phone"),
        mail=data.get("mail"),
        telegram=data.get("telegram"),
        country=data.get("country"),
        region=data.get("region"),
        city=data.get("city"),
        users=data.get("users"),
        user=data.get("user"),
        created=data.get("created"),
        updated=data.get("updated"),
    )


@router.post("/get/", response_model=SpacesGetResponse)
async def handler(request: Request, data: SpacesGetRequest = Body(...)):
    """Get spaces list or specific space by link/id."""

    if request.state.status < 2:
        raise ErrorAccess("get")

    # Resolve fetch by link for attachment flow
    if data.link:
        try:
            space = _ensure_space_instance(Space.get(link=data.link))
        except ErrorWrong as exc:
            raise ErrorWrong("space") from exc

        if data.attach and request.state.user:
            attach_user_to_space(space, request.state.user)

        return {
            "spaces": [serialize_space(space)],
            "count": 1,
        }

    attached_only = data.attached or request.state.status < 4
    if attached_only and not request.state.user:
        return {"spaces": [], "count": 0}

    params = dict(
        ids=data.id,
        search=data.search,
        limit=data.limit,
        offset=data.offset,
        extra={"users": request.state.user} if attached_only else None,
    )
    spaces = Space.complex(**params)

    if not isinstance(spaces, list):
        spaces = [spaces] if spaces else []

    return {
        "spaces": [serialize_space(space) for space in spaces],
        "count": len(spaces) if data.id is None else None,
    }

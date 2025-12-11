"""
Update editable user profile fields stored in the local overlay.
"""

from typing import Any

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, ConfigDict, Field
from consys.errors import ErrorAccess, ErrorInvalid, ErrorWrong

from models.user import DEFAULT_BALANCE, User, UserLocal
from models.track import Track, TrackAction, TrackObject, format_changes


router = APIRouter()


class SaveUserRequest(BaseModel):
    id: int | None = Field(
        None,
        description="Target user id (admin only)",
        examples=[42],
    )
    login: str | None = Field(
        None,
        description="Preferred login/username",
        examples=["jdoe"],
    )
    name: str | None = Field(
        None,
        description="First name",
        examples=["John"],
    )
    surname: str | None = Field(
        None,
        description="Last name",
        examples=["Doe"],
    )
    phone: int | str | None = Field(
        None,
        description="Phone number in international format (digits only)",
        examples=["79998887766"],
    )
    mail: str | None = Field(
        None,
        description="Email address",
        examples=["user@example.com"],
    )
    image: str | None = Field(
        None,
        description="Avatar image URL",
        examples=["https://cdn.example.com/avatar.png"],
    )
    locale: str | None = Field(
        None,
        description="Preferred locale code",
        examples=["en"],
    )
    mailing: bool | None = Field(
        None,
        description="Marketing mailing opt-in flag",
        examples=[True],
    )
    wallet: str | None = Field(
        None,
        description="Wallet identifier",
        examples=["0x123"],
    )
    balance: int | str | None = Field(
        None,
        description="Adjust user balance (admin only)",
        examples=[1500],
    )
    status: int | None = Field(
        None,
        description="Update user status / access level (admin only)",
        examples=[3],
    )


class UserPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    login: str | None = None
    name: str | None = None
    surname: str | None = None
    phone: int | None = None
    mail: str | None = None
    image: str | None = None
    locale: str | None = None
    mailing: bool | None = None
    wallet: str | None = None
    status: int | None = None
    balance: int | None = None
    premium: bool | None = None
    roles: list[int] | None = None


class SaveUserResponse(BaseModel):
    user: UserPayload


def _merge_local_data(base: dict[str, Any], local: dict[str, Any]) -> dict[str, Any]:
    """Apply non-empty local fields over the base user payload."""
    filtered_local = {key: value for key, value in local.items() if value is not None}
    return {**base, **filtered_local}


def _normalize_phone(phone: str | int | None) -> int | None:
    """Keep only digits; return None for empty input, raise for invalid."""
    if phone is None:
        return None

    phone_str = str(phone)
    digits = "".join(ch for ch in phone_str if ch.isdigit())
    if not digits:
        raise ErrorInvalid("phone")

    return int(digits)


def _normalize_balance(balance: str | int | None) -> int | None:
    """Normalize balance input to integer; allow clearing."""
    if balance is None:
        return None

    if isinstance(balance, str):
        stripped = balance.strip()
        if stripped == "":
            return None
        if not stripped.lstrip("-").isdigit():
            raise ErrorInvalid("balance")
        return int(stripped)

    return int(balance)


@router.post("/save/", response_model=SaveUserResponse)
async def handler(
    request: Request,
    data: SaveUserRequest = Body(...),
):
    """Persist profile fields to the UserLocal overlay."""

    if request.state.status < 3 or not request.state.user:
        raise ErrorAccess("save")

    target_user_id = data.id or request.state.user
    is_admin = request.state.status >= 6

    if data.id and target_user_id != request.state.user and not is_admin:
        raise ErrorAccess("save user")

    try:
        user_local = UserLocal.get(target_user_id)
        created = False
    except ErrorWrong:
        user_local = UserLocal(
            id=target_user_id,
            balance=DEFAULT_BALANCE,
        )
        created = True

    tracked_fields = {
        "id",
        "login",
        "name",
        "surname",
        "phone",
        "mail",
        "image",
        "locale",
        "mailing",
        "wallet",
        "balance",
        "status",
    }
    before_state = None if created else user_local.json(fields=tracked_fields)

    payload = data.model_dump(exclude_unset=True)
    payload.pop("id", None)

    if not is_admin:
        payload.pop("status", None)
        payload.pop("balance", None)

    if "balance" in payload:
        payload["balance"] = _normalize_balance(payload["balance"])

    if "status" in payload and payload["status"] is not None:
        try:
            payload["status"] = int(payload["status"])
        except (TypeError, ValueError) as exc:
            raise ErrorInvalid("status") from exc

    if "phone" in payload:
        phone_raw = payload["phone"]
        if isinstance(phone_raw, str) and phone_raw.strip() == "":
            payload["phone"] = None
        else:
            payload["phone"] = _normalize_phone(phone_raw)

    for field, value in payload.items():
        setattr(user_local, field, value)

    if created or payload:
        changes = format_changes(user_local.get_changes())
        user_local.save()

        Track.log(
            object=TrackObject.USER,
            action=TrackAction.CREATE if created else TrackAction.UPDATE,
            user=request.state.user,
            token=request.state.token,
            request=request,
            params={
                "id": target_user_id,
                "changes": changes,
            },
        )

    user_data = await User.complex(
        token=request.state.token,
        id=target_user_id,
    )

    if isinstance(user_data, str):
        raise ErrorInvalid("user")

    if isinstance(user_data, list):
        user_data = user_data[0] if user_data else {}

    if not isinstance(user_data, dict):
        raise ErrorInvalid("user")

    merged_user = _merge_local_data(user_data, user_local.json())

    return {
        "user": merged_user,
    }

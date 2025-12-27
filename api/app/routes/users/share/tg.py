"""
Prepare a Telegram inline share message for Mini Apps.
"""

import json

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import BaseError, ErrorAccess
from libdev.req import fetch

from lib import cfg, generate
from models.user import User, UserLocal


router = APIRouter()

DEFAULT_SHARE_IMAGE = "https://placehold.co/600x400/png"


class TelegramShareRequest(BaseModel):
    url: str | None = Field(
        None,
        description="Target URL for the message button",
        examples=["https://example.com/?utm=abc123"],
    )
    text: str = Field(
        ...,
        description="Message caption text shown under the image",
        examples=["Join with me:"],
    )
    button: str | None = Field(
        None,
        description="Button label shown in the message",
        examples=["Share"],
    )
    image: str | None = Field(
        None,
        description="HTTPS image URL to show in the share preview",
        examples=["https://placehold.co/600x400/png"],
    )


class TelegramShareResponse(BaseModel):
    id: str = Field(..., description="Prepared inline message id", examples=["abc123"])
    expiration_date: int = Field(
        ..., description="Expiration timestamp (unix seconds)", examples=[1712345678]
    )


@router.post("/tg/", response_model=TelegramShareResponse)
async def handler(
    request: Request,
    data: TelegramShareRequest = Body(...),
):
    if request.state.status < 3 or not request.state.user:
        raise ErrorAccess("share")

    token = cfg("tg.token")
    if not token:
        raise BaseError("tg.token")

    user, _ = UserLocal.get_or_create(request.state.user)

    url = (data.url or "").strip()
    text = data.text.strip()
    button = (data.button or "").strip()
    image = (data.image or "").strip()

    if not text:
        raise BaseError("text")
    if not image:
        image = DEFAULT_SHARE_IMAGE

    result = {
        "type": "photo",
        "id": generate(16),
        "photo_url": image,
        "thumb_url": image,
        "caption": text,
    }
    if url and button:
        result["reply_markup"] = {
            "inline_keyboard": [[{"text": button, "url": url}]],
        }

    user_global = User.get(request.state.user)  # FIXME: use local
    payload = {
        "user_id": int(user_global.get_social(2)["id"]),
        "result": json.dumps(result, ensure_ascii=False),
        "allow_user_chats": True,
        "allow_bot_chats": True,
        "allow_group_chats": True,
        "allow_channel_chats": True,
    }

    code, response = await fetch(
        f"https://api.telegram.org/bot{token}/savePreparedInlineMessage",
        payload=payload,
        type_req="post",
        type_data="json",
        timeout=15,
    )

    if code != 200 or not isinstance(response, dict) or not response.get("ok"):
        detail = response.get("description") if isinstance(response, dict) else None
        raise BaseError(detail or "tg_share")

    result_data = response.get("result") or {}
    message_id = result_data.get("id")
    expiration_date = result_data.get("expiration_date")
    if not message_id or not isinstance(expiration_date, int):
        raise BaseError("tg_share")

    return {"id": message_id, "expiration_date": expiration_date}

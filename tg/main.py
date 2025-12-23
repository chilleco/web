import asyncio
from typing import Any
from urllib.parse import parse_qs, parse_qsl, urlencode, urljoin, urlparse, urlunparse

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import CommandStart
from aiogram.filters.command import CommandObject
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from libdev.cfg import cfg
from libdev.gen import generate
from libdev.log import log
from libdev.req import fetch


TOKEN = cfg("tg.token")
WEBHOOK_URL = cfg("tg")
WEBHOOK_SECRET = cfg("tg.secret")
API_URL = cfg("api")
WEB_URL = cfg("web")
DEFAULT_LOCALE = cfg("locale", "en")
START_TEXT = cfg("tg.start_text", "Open the app to continue.")
START_BUTTON = cfg("tg.start_button", "Open app")

bot: Bot | None = None
dispatcher = Dispatcher()
router = Router()
dispatcher.include_router(router)

app = FastAPI(title=cfg("NAME", "TG Bot"))

_user_tokens: dict[int, str] = {}
_token_lock = asyncio.Lock()


def _build_headers(locale: str | None) -> dict[str, str]:
    headers: dict[str, str] = {}
    if locale:
        headers["Accept-Language"] = locale
    return headers


def _parse_start_payload(payload: str | None) -> str | None:
    if not payload:
        return None

    normalized = payload.strip()
    if not normalized:
        return None

    lowered = normalized.lower()
    if lowered in {"auth", "start"}:
        return None

    if "=" in normalized or "&" in normalized:
        parsed = parse_qs(normalized, keep_blank_values=True)
        value = parsed.get("utm", [None])[0]
        if value:
            return value

    if normalized.startswith("utm_"):
        return normalized[4:] or None

    return normalized


def _build_app_url(utm: str | None, locale: str | None) -> str:
    base = (WEB_URL or "").strip()
    if not base:
        return ""

    base = base.rstrip("/") + "/"
    locale_segment = (locale or DEFAULT_LOCALE or "").strip()
    if locale_segment:
        base = urljoin(base, f"{locale_segment}/")

    parsed = urlparse(base)
    query = dict(parse_qsl(parsed.query))
    if utm:
        query["utm"] = utm

    return urlunparse(parsed._replace(query=urlencode(query)))


async def _get_user_token(
    user_id: int, utm: str | None, locale: str | None
) -> str | None:
    token = _user_tokens.get(user_id)
    if token:
        return token

    async with _token_lock:
        token = _user_tokens.get(user_id)
        if token:
            return token

        if not API_URL:
            log.error("Missing API base URL for Telegram bot auth")
            return None

        payload = {
            "token": generate(32),
            "network": "tg",
            "utm": utm,
        }
        headers = _build_headers(locale)
        status, response = await fetch(
            f"{API_URL}users/token/", payload, headers=headers
        )
        if status != 200 or not isinstance(response, dict) or not response.get("token"):
            log.warning(f"Failed to obtain bot auth token: {status} {response}")
            return None

        token = response["token"]
        _user_tokens[user_id] = token
        return token


async def _auth_user(user: types.User, utm: str | None) -> None:
    token = await _get_user_token(user.id, utm, user.language_code)
    if not token:
        return

    if not API_URL:
        log.error("Missing API base URL for Telegram bot auth")
        return

    image_url = await _get_avatar_url(user.id)
    payload: dict[str, Any] = {
        "user": user.id,
        "login": user.username,
        "name": user.first_name,
        "surname": user.last_name,
        "image": image_url,
        "utm": utm,
    }
    headers = _build_headers(user.language_code)
    headers["Authorization"] = f"Bearer {token}"

    print("!", payload)
    status, response = await fetch(f"{API_URL}users/bot/", payload, headers=headers)
    print("!!!", status, response)
    if status == 401:
        _user_tokens.pop(user.id, None)
        token = await _get_user_token(user.id, utm, user.language_code)
        if token:
            headers["Authorization"] = f"Bearer {token}"
            status, response = await fetch(
                f"{API_URL}users/bot/", payload, headers=headers
            )

    if status != 200:
        log.warning(f"Telegram bot auth failed: {status} {response}")


async def _send_start_message(
    chat_id: int, utm: str | None, locale: str | None
) -> None:
    if not bot:
        log.error("Telegram bot is not initialized")
        return

    url = _build_app_url(utm, locale)
    if not url:
        log.error("Missing WEB base URL for Telegram mini app link")
        return

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=START_BUTTON,
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )

    await bot.send_message(
        chat_id=chat_id,
        text=START_TEXT,
        reply_markup=keyboard,
        disable_web_page_preview=True,
    )


async def _get_avatar_url(user_id: int) -> str | None:
    if not bot or not TOKEN:
        return None

    try:
        photos = await bot.get_user_profile_photos(user_id, limit=1)
        if not photos.total_count or not photos.photos:
            return None
        photo = photos.photos[0][-1]
        file = await bot.get_file(photo.file_id)
        if not file.file_path:
            return None
    except Exception as exc:  # pylint: disable=broad-except
        log.warning(f"Failed to fetch Telegram avatar: {exc}")
        return None

    return f"https://api.telegram.org/file/bot{TOKEN}/{file.file_path}"


@router.message(CommandStart())
async def handle_start(message: types.Message, command: CommandObject) -> None:
    if message.chat.type != "private" or not message.from_user:
        return

    args = command.args if command else None
    utm = _parse_start_payload(args)
    print("!!", utm)
    await _auth_user(message.from_user, utm)
    await _send_start_message(
        chat_id=message.chat.id,
        utm=utm,
        locale=message.from_user.language_code,
    )


@app.post("/")
async def webhook(request: Request):
    if WEBHOOK_SECRET:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret != WEBHOOK_SECRET:
            return JSONResponse(status_code=403, content={"ok": False})

    if not bot:
        log.error("Telegram bot is not initialized")
        return {"ok": True}

    try:
        update_data = await request.json()
        update = Update.model_validate(update_data)
        await dispatcher.feed_update(bot, update)
    except Exception as exc:  # pylint: disable=broad-except
        log.error(f"Webhook handling failed: {exc}")
    return {"ok": True}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tg"}


@app.on_event("startup")
async def startup() -> None:
    if not TOKEN:
        log.error("Missing Telegram bot token (tg.token)")
        return

    global bot
    bot = Bot(TOKEN)

    if WEBHOOK_URL:
        await bot.set_webhook(
            WEBHOOK_URL,
            allowed_updates=dispatcher.resolve_used_update_types(),
            secret_token=WEBHOOK_SECRET,
        )


@app.on_event("shutdown")
async def shutdown() -> None:
    if bot:
        await bot.session.close()

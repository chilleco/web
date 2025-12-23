import asyncio
import json
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, parse_qsl, urlencode, urljoin, urlparse, urlunparse

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import Command, CommandStart
from aiogram.filters.command import CommandObject
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from libdev.cfg import cfg
from libdev.codes import get_flag
from libdev.gen import generate
from libdev.log import log
from libdev.req import fetch


TOKEN = cfg("tg.token")
WEBHOOK_URL = cfg("tg")
WEBHOOK_SECRET = cfg("tg.secret")
API_URL = cfg("api")
WEB_URL = cfg("web")
DEFAULT_LOCALE = cfg("locale", "en")
MESSAGES_DIR = Path(__file__).resolve().parent / "messages"

bot: Bot | None = None
dispatcher = Dispatcher()
router = Router()
dispatcher.include_router(router)

app = FastAPI(title=cfg("NAME", "TG Bot"))

_user_tokens: dict[int, str] = {}
_token_lock = asyncio.Lock()


def _load_localized_texts() -> dict[str, dict[str, str]]:
    texts: dict[str, dict[str, str]] = {}
    if not MESSAGES_DIR.exists():
        return texts

    for path in MESSAGES_DIR.glob("*.json"):
        locale = path.stem
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # pylint: disable=broad-except
            log.warning(f"Failed to load {path.name}: {exc}")
            continue

        texts[locale] = {
            "start_text": data.get("start_text"),
            "start_button": data.get("start_button"),
            "auth_text": data.get("auth_text"),
        }

    return texts


LOCALIZED_TEXTS = _load_localized_texts()
SUPPORTED_LOCALES = set(LOCALIZED_TEXTS.keys())


def _build_headers(locale: str | None) -> dict[str, str]:
    headers: dict[str, str] = {}
    if locale:
        headers["Accept-Language"] = locale
    return headers


def _resolve_text_locale(locale: str | None) -> str:
    fallback = DEFAULT_LOCALE if DEFAULT_LOCALE in LOCALIZED_TEXTS else "en"
    if not locale:
        return fallback

    key = locale.lower().replace("_", "-").split("-")[0]
    if key in SUPPORTED_LOCALES and key in LOCALIZED_TEXTS:
        return key
    return fallback


def _resolve_message(locale: str | None, key: str) -> str:
    text_locale = _resolve_text_locale(locale)
    current = LOCALIZED_TEXTS.get(text_locale)
    if current and current.get(key):
        return current[key]

    fallback_locale = DEFAULT_LOCALE if DEFAULT_LOCALE in LOCALIZED_TEXTS else "en"
    fallback = LOCALIZED_TEXTS.get(fallback_locale)
    if fallback and fallback.get(key):
        return fallback[key]

    for value in LOCALIZED_TEXTS.values():
        if value.get(key):
            return value[key]

    log.error(f"Missing localized bot message: {key}")
    return ""


def _build_auth_label(user: types.User) -> str:
    locale = _resolve_text_locale(user.language_code)
    try:
        flag = get_flag(locale)
    except Exception:  # pylint: disable=broad-except
        flag = ""

    name = " ".join(part for part in [user.first_name, user.last_name] if part)
    login = f"@{user.username}" if user.username else ""

    pieces = [part for part in [flag, name] if part]
    text = " ".join(pieces)
    if login:
        text = f"{text} ({login})" if text else login
    return text


def _build_auth_text(user: types.User) -> str:
    template = _resolve_message(user.language_code, "auth_text")
    if not template:
        return ""
    try:
        return template.format(user=_build_auth_label(user))
    except Exception as exc:  # pylint: disable=broad-except
        log.warning(f"Failed to format auth text: {exc}")
        return ""


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

    status, response = await fetch(f"{API_URL}users/bot/", payload, headers=headers)
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

    text = _resolve_message(locale, "start_text")
    button = _resolve_message(locale, "start_button")
    if not text or not button:
        return

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=button,
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )

    await bot.send_message(
        chat_id=chat_id,
        text=text,
        reply_markup=keyboard,
        disable_web_page_preview=True,
    )


async def _send_auth_message(chat_id: int, user: types.User) -> None:
    if not bot:
        log.error("Telegram bot is not initialized")
        return

    text = _build_auth_text(user)
    if not text:
        return

    await bot.send_message(
        chat_id=chat_id,
        text=text,
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
    await _auth_user(message.from_user, utm)
    await _send_auth_message(message.chat.id, message.from_user)
    await _send_start_message(
        chat_id=message.chat.id,
        utm=utm,
        locale=message.from_user.language_code,
    )


@router.message(Command("help", "info", "about"))
async def handle_info(message: types.Message) -> None:
    if message.chat.type != "private" or not message.from_user:
        return

    await _auth_user(message.from_user, None)
    await _send_auth_message(message.chat.id, message.from_user)


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

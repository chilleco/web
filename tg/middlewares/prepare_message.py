"""
Prepare message middleware
"""

from lib import report
from lib.tg import tg
from lib.queue import get
from middlewares.check_user import check_user


async def rm_last(chat, cache):
    """Remove last message"""
    if cache.get("m"):
        await tg.rm(chat.id, cache["m"])


async def prepare_message(data, action="typing"):
    """Prepare new message"""

    if "message" in data:
        message = data.message
        callback = data
    else:
        message = data
        callback = None

    locale = message.from_user.language_code
    if locale != "ru":
        locale = "en"

    chat = message.chat
    if chat.id < 0:
        return None, None, None, locale

    if callback:
        text = callback.data
    else:
        text = message.text
    cache = get(chat.id, {})

    try:
        await rm_last(chat, cache)
        if action:
            await tg.bot.send_chat_action(chat.id, action=action)
        if callback:
            await tg.bot.answer_callback_query(callback.id)
    except Exception as e:  # pylint: disable=broad-except
        await report.error("prepare_message", error=e)

    image = message.from_user.get_profile_photos()

    if await check_user(
        chat,
        public=True,
        text=text,
        locale=message.from_user.language_code,
        image=image,
    ):
        return None, None, None, locale

    return chat, text, cache, locale

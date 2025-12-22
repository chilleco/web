from aiogram.enums import ChatMemberStatus
from consys.errors import ErrorWrong

from lib import report
from lib.tg import tg
from models.user import UserLocal


async def check(user_id, params):
    if not params or not params.get("chat_id"):
        raise ErrorWrong("chat_id")

    user = UserLocal.get(user_id)
    if not user.social_user:
        raise ErrorWrong("id")

    try:
        response = await tg.bot.get_chat_member(
            chat_id=params["chat_id"], user_id=user.social_user
        )
    except Exception as e:
        await report.error(
            "Check chat member",
            {
                "user": user_id,
                "chat_id": params["chat_id"],
                "user_id": user.social_user,
            },
            error=e,
        )
        return 1

    if response.status in [
        ChatMemberStatus.CREATOR,
        ChatMemberStatus.ADMINISTRATOR,
        ChatMemberStatus.MEMBER,
    ]:
        return 3

    return 1

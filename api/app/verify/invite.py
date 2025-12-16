from consys.errors import ErrorWrong

from models.user import UserLocal


def count_refs(user_id):
    return UserLocal.count(referrer=user_id)


async def check(user_id, params):
    if not params or not params.get("count"):
        raise ErrorWrong("count")

    if count_refs(user_id) >= params["count"]:
        return 3

    return 1

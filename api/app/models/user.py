from userhub import BaseUser as User
from libdev.codes import get_flag
from consys.errors import ErrorWrong

from lib import cfg
from models import Base, Attribute

ADMIN_TOKEN = cfg("userhub.token")
DEFAULT_BALANCE = 1000


class UserLocal(Base):
    _name = "users"

    login = Attribute(types=str)
    name = Attribute(types=str)
    surname = Attribute(types=str)
    phone = Attribute(types=int)
    mail = Attribute(types=str)
    image = Attribute(types=str)
    status = Attribute(types=int)

    roles = Attribute(types=list)

    step = Attribute(types=int, default=0)

    balance = Attribute(types=int, default=0)
    premium = Attribute(types=bool, default=False)
    mailing = Attribute(types=bool, default=False)
    wallet = Attribute(types=str)

    spaces = Attribute(types=list, default=list)

    # Referral
    referrer = Attribute(types=int)
    frens = Attribute(types=list)
    utm = Attribute(types=str)

    # Cache
    locale = Attribute(types=str, default="en")
    social = Attribute(types=int)
    tasks = Attribute(types=list)
    # draws = Attribute(types=list)
    # pays = Attribute(types=list)


async def complex_global_users(**kwargs):
    return await User.complex(
        token=ADMIN_TOKEN,  # FIXME: app token in userhub
        **kwargs,
    )


def get_social(obj, social):
    for i in obj.get("social", []):
        if i["id"] == social:
            return {
                "id": i["user"],
                "login": i.get("login"),
                "locale": i.get("locale") or cfg("locale", "en"),
                "title": f"{i.get('name') or ''} {i.get('surname') or ''}".strip(),
            }
    return None


def get_name(obj):
    social = get_social(obj, 2)  # FIXME: 2

    id_ = f"#{obj['id']}"  # social['id']

    login = social.get("login")
    if login:
        login = f"@{login.lower()}"

    title = obj.get("title") or social.get("title")
    title = title.replace("None", "").strip()

    locale = obj.get("locale") or social.get("locale")
    if locale and locale in {"en"}:
        locale = None

    text = ""
    used_login = False
    used_id = False
    if locale:
        text += f"{get_flag(locale)} "  # FIXME: undefined == 🇬🇧
    if title:
        text += title
    elif login:
        text += login
        used_login = True
    else:
        text += id_
        used_id = True

    if not used_id:
        text += f" ({id_}"
        if not used_login and login:
            text += f", {login}"
        text += ")"

    return text


async def complex_global_user_by_social(social_user):
    users = await complex_global_users(extra={"social.user": str(social_user)})
    if not users:
        raise ErrorWrong("user")
    return users[0]


__all__ = (
    "DEFAULT_BALANCE",
    "User",
    "UserLocal",
    "complex_global_users",
    "get_social",
    "get_name",
    "complex_global_user_by_social",
)

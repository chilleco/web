from consys.errors import ErrorWrong

from models.space import Space
from models.user import UserLocal


def _ensure_space_instance(space: Space | dict | list[Space | dict]) -> Space:
    """Normalize various space representations to a Space instance."""
    if isinstance(space, list):
        space = space[0] if space else None
    if space is None:
        raise ErrorWrong("space")
    if hasattr(space, "save"):
        return space  # already model instance
    if isinstance(space, dict) and space.get("id"):
        return Space.get(space["id"])
    raise ErrorWrong("space")


def attach_user_to_space(
    space: Space | dict | list[Space | dict],
    user_id: int,
) -> None:
    """Attach user to space and persist both sides."""
    space = _ensure_space_instance(space)
    if not user_id:
        return

    if user_id not in space.users:
        space.users.append(user_id)
        space.save()

    user_local, _ = UserLocal.get_or_create(user_id)
    if space.id not in user_local.spaces:
        user_local.spaces.append(space.id)
        user_local.save()


def detach_space_from_users(space: Space) -> None:
    """Remove space reference from all attached users."""
    space = _ensure_space_instance(space)
    for user_id in space.users or []:
        try:
            user_local = UserLocal.get(user_id)
        except ErrorWrong:
            continue

        if space.id in user_local.spaces:
            user_local.spaces.remove(space.id)
            user_local.save()

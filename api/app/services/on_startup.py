"""
Tasks on start
"""

from lib import log
from services.cache import cache_categories
from tasks import reset_online_users


async def on_startup():
    """Tasks on start"""
    try:
        await reset_online_users.kiq()
    except Exception as exc:  # pylint: disable=broad-except
        log.error("Failed to enqueue reset_online_users: {}", str(exc))
    cache_categories()  # TODO: remove

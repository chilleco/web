"""
Tasks on start
"""

from models.socket import Socket
from services.cache import cache_categories
from routes.users.disconnect import online_stop


async def _reset_online_users():
    """Reset online users"""
    for socket in Socket.get(fields={}):
        await online_stop(socket.id)


async def on_startup():
    """Tasks on start"""
    await _reset_online_users()
    cache_categories()  # TODO: remove

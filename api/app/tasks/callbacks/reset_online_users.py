"""
Reset online users callback task.
"""

from __future__ import annotations

from models.socket import Socket
from routes.users.disconnect import online_stop
from tasks.broker import broker


@broker.task
async def reset_online_users() -> None:
    """Reset online users"""

    for socket in Socket.get(fields={}):
        await online_stop(socket.id)

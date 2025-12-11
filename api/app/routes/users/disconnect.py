"""
The disconnect socket of the user object of the API
"""

import time

from consys.errors import ErrorWrong

from lib import report
from lib.sockets import sio
from models.socket import Socket
from models.track import Track, TrackAction, TrackObject
from routes.users.online import _other_sessions, _online_count


async def online_stop(socket_id, close=True):
    """Stop online session of the user"""

    # TODO: Объединять сессии в онлайн по пользователю
    # TODO: Если сервер был остановлен, отслеживать сессию

    try:
        socket = Socket.get(socket_id)
    except ErrorWrong:
        # NOTE: method "exit" -> socket "disconnect"
        return

    now = time.time()

    # TODO: now online & last online
    # user, _ = get_user(socket.token)
    # # Update user online info
    # if user.id:
    #     user.last_online = now
    #     user.save()

    # Action tracking
    Track.log(
        object=TrackObject.SESSION,
        action=TrackAction.DISCONNECT,
        user=socket.user,
        token=socket.token,
        params={
            "session": socket.id,
            "started_at": socket.created,
            "ended_at": now,
            "duration": now - socket.created,
        },
        created=socket.created,
        expired=now,
        context={"source": "socket"},
    )

    # Remove token / Reset user
    if close:
        socket.rm()
    else:
        del socket.user
        socket.save()

    # Other sessions of this user
    other = _other_sessions(socket.user, socket.token)
    if other:
        return

    # Send sockets about the user to all online users
    count = _online_count()
    if count:
        await sio.emit(
            "online_del",
            {
                "count": count,
                "users": [{"id": socket.user}],  # TODO: Админам
            },
        )


@sio.on("disconnect")
async def disconnect(sid):
    """Disconnect"""
    await report.debug("OUT", sid)
    await online_stop(sid)

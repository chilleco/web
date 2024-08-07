"""
The logout method of the user object of the API
"""

from fastapi import APIRouter, Request
from consys.errors import ErrorAccess

from lib import report
from models.socket import Socket
from routes.users.disconnect import online_stop


router = APIRouter()


@router.post("/exit/")
async def handler(
    request: Request,
):
    """Log out"""

    # TODO: Сокет на авторизацию на всех вкладках токена
    # TODO: Перезапись информации этого токена уже в онлайне
    # TODO: Отправлять сокет всем сессиям этого браузера на выход

    # Not authorized
    if request.state.status == 2:
        await report.warning(
            "Already unauth",
            {
                "token": request.state.token,
                "user": request.state.user,
            },
        )

        raise ErrorAccess("exit")

    # Close session
    sockets = Socket.get(token=request.state.token, fields={})
    for socket in sockets:
        await online_stop(socket.id, close=False)

    # Reset
    # FIXME: unauth via core API
    # token = Token.get(request.state.token, fields={'user'})
    # del token.user
    # token.save()

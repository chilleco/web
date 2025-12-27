"""
User authorization
"""

# TODO: cache + use local

from fastapi import Request
from consys.errors import ErrorWrong

from models.user import User


async def sign(request: Request):
    """Get user object"""

    if request.state.user:
        try:
            return await User.get(
                token=request.state.token,
                id=request.state.user,
                # fields=list({"id"}),
            )
        except ErrorWrong:
            pass

    return User()

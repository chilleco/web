"""
User authorization
"""

from fastapi import Request
from consys.errors import ErrorWrong

from models.user import User


def sign(request: Request):
    """ Get user object """

    if request.state.user:
        try:
            return User.get(request.state.user)
        except ErrorWrong:
            pass

    return User()

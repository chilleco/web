"""
Check access by token
"""

import jwt
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from consys.errors import ErrorInvalid

from lib import report


async def jwt_auth(jwt_secret, token):
    if not token or token == "null":
        raise ErrorInvalid("token")

    token = jwt.decode(token, jwt_secret, algorithms="HS256")

    return (
        token["token"],
        token.get("user", 0),
        token.get("status", 3),
        token.get("network", 0),
    )


class AccessMiddleware(BaseHTTPMiddleware):
    """Access checking middleware"""

    def __init__(self, app, jwt_secret, whitelist):
        super().__init__(app)
        self.jwt = jwt_secret
        self.whitelist = whitelist

    async def dispatch(self, request: Request, call_next):
        url = request.url.path

        # TODO: check current ip with token ip

        token = request.cookies.get("Authorization") or request.headers.get(
            "Authorization"
        )

        # Whitelist
        if request.method != "POST" or (not token and url in self.whitelist):
            request.state.token = None
            request.state.user = 0
            request.state.status = 3
            request.state.network = 0
            return await call_next(request)

        if not token:
            await report.warning("No token", {"url": url})
            return Response(content="Invalid token", status_code=401)

        try:
            token = token.split(" ")[1]
            token, user, status, network = await jwt_auth(self.jwt, token)
        except Exception as e:  # pylint: disable=broad-except
            await report.warning(
                "Invalid token",
                {
                    "url": url,
                    "token": token,
                },
                error=e,
            )
            return Response(content="Invalid token", status_code=401)

        request.state.token = token
        request.state.user = user
        request.state.status = status
        request.state.network = network

        return await call_next(request)

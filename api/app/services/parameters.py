"""
Get request & response parameters
"""

import time
from uuid import uuid4

import sentry_sdk
from fastapi import Request
from libdev.dev import check_public_ip
from starlette.middleware.base import BaseHTTPMiddleware

from services.logging import clear_request_context, set_request_context


class ParametersMiddleware(BaseHTTPMiddleware):
    """Getting parameters middleware"""

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid4().hex
        request.state.request_id = request_id
        set_request_context(request_id)
        sentry_sdk.set_extra("request_id", request_id)

        if request.method != "POST":
            request.state.ip = None
            try:
                response = await call_next(request)
            finally:
                clear_request_context()
            response.headers["X-Request-Id"] = request_id
            return response

        # Request parameters
        request.state.url = request.url.path
        request.state.start = time.time()
        locale = request.headers.get("accept-language")
        request.state.locale = (
            "ru" if locale and "ru" in locale.lower() else "en"
        )  # TODO: all locales, detect by browser
        request.state.ip = check_public_ip(request.headers.get("x-real-ip"))
        request.state.user_agent = request.headers.get("user-agent")

        sentry_sdk.set_user(
            {
                "id": getattr(request.state, "user", None) or None,
                "ip_address": request.state.ip,
            }
        )
        if getattr(request.state, "network", None) is not None:
            sentry_sdk.set_tag("network", request.state.network)
        if request.state.locale:
            sentry_sdk.set_tag("locale", request.state.locale)

        # Call
        try:
            response = await call_next(request)
        finally:
            clear_request_context()

        # Response parameters
        request.state.process_time = time.time() - request.state.start
        response.headers["X-Process-Time"] = f"{request.state.process_time:.3f}"
        response.headers["X-Request-Id"] = request_id

        return response

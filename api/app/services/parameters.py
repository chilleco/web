"""
Get request & response parameters
"""

import time
from uuid import uuid4

from fastapi import Request
from libdev.dev import check_public_ip
from starlette.middleware.base import BaseHTTPMiddleware

from lib import clear_request_context, set_request_context
from services.sentry import (
    set_request_context as set_sentry_request_context,
)
from services.sentry import set_request_tags, set_request_user


def _trace_id_from_header(value: str | None) -> str | None:
    if not value:
        return None
    parts = value.split("-", 1)
    return parts[0] if parts else None


class ParametersMiddleware(BaseHTTPMiddleware):
    """Getting parameters middleware"""

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid4().hex
        trace_id = _trace_id_from_header(request.headers.get("sentry-trace"))
        request.state.request_id = request_id
        request.state.trace_id = trace_id
        set_request_context(request_id, trace_id)
        set_sentry_request_context(request_id, trace_id)

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

        set_request_user(
            user_id=getattr(request.state, "user", None) or None,
            ip=request.state.ip,
        )
        set_request_tags(
            network=getattr(request.state, "network", None),
            locale=request.state.locale,
        )

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

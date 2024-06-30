"""
Request processing and response statuses formatting
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from lib import report


class ErrorsMiddleware(BaseHTTPMiddleware):
    """Formatting errors middleware"""

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Whitelist
        if request.method != "POST":
            return await call_next(request)

        try:
            response = await call_next(request)

            # Report
            if response.status_code not in {200, 303, 401}:
                await report.warning(
                    "Non-success response",
                    {
                        "method": request.method,
                        "url": request.state.url,
                        "status": response.status_code,
                    },
                )

            return response

        except Exception as e:  # pylint: disable=broad-except
            await report.critical(str(e), error=e)
            return Response(content=str(e), status_code=500)

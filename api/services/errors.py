"""
Request processing and response statuses formatting
"""

import traceback

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from consys.errors import BaseError

from lib import log, report


class ErrorsMiddleware(BaseHTTPMiddleware):
    """Formatting errors middleware"""

    def __init__(self, app):
        super().__init__(app)

    async def _create_body_iterator(self, body: bytes):
        yield body

    async def dispatch(self, request: Request, call_next):
        try:
            # # Create a new request with the cached body
            # body = await request.body()
            # request = Request(
            #     request.scope,
            #     receive=lambda: {"type": "http.request", "body": request_body},
            # )

            response = await call_next(request)

            if response.status_code not in {200, 303, 401}:
                # # Log request
                # request_body = body.decode("utf-8")
                # log.info(f"Request: {request.method} {request.url}")
                # log.info(f"Request Body: {request_body}")

                # Log response
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                response.body_iterator = self._create_body_iterator(response_body)
                response_body = response_body.decode("utf-8")
                log.info(f"Response: {response.status_code}")
                log.info(f"Response Body: {response_body}")

                # Report
                await report.warning(
                    response_body,
                    {
                        "method": request.method,
                        "url": request.state.url,
                        "status": response.status_code,
                        # "request": request_body,
                    },
                )

            return response

        except BaseError as e:
            return Response(content=vars(e)["txt"], status_code=400)

        except Exception as e:  # pylint: disable=broad-except
            # Log
            tb_str = "".join(traceback.format_tb(e.__traceback__))
            log.error(
                f"Exception during request processing: {str(e)}\nTraceback: {tb_str}"
            )

            # Report
            await report.critical(str(e), error=e)

            return Response(content=str(e), status_code=500)

"""
Request processing and response statuses formatting
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from consys.errors import BaseError
from exceptiongroup import ExceptionGroup

from lib import report


def handle_exception_group(e_group):
    """ Handling nested errors """

    for e in e_group.exceptions:
        if isinstance(e, ExceptionGroup):
            return handle_exception_group(e)

        if isinstance(e, BaseError):
            return Response(content=vars(e)['txt'], status_code=400)

        return Response(content=str(e), status_code=500)


class ErrorsMiddleware(BaseHTTPMiddleware):
    """ Formatting errors middleware """

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Whitelist
        if request.method != 'POST':
            return await call_next(request)

        try:
            response = await call_next(request)

            # Report
            if response.status_code not in {200, 303, 401}:
                await report.warning("Non-success response", {
                    'url': request.state.url,
                    'status': response.status_code,
                })

            return response

        except ExceptionGroup as e:
            return handle_exception_group(e)

        except Exception as e:  # pylint: disable=broad-except
            await report.critical(str(e), error=e)
            return Response(content=str(e), status_code=500)

"""
The cancel method of the payment object of the API
"""

from fastapi import APIRouter, Request
from consys.errors import ErrorAccess # , ErrorRepeat


router = APIRouter()


@router.post("/cancel/")
async def handler(
    request: Request,
):
    """ Delete payments data """

    # TODO: update via core API

    # No access
    if request.state.status < 3:
        raise ErrorAccess('cancel')

    # # No payment data
    # if not user.pay:
    #     raise ErrorRepeat('cancel')

    # del user.pay
    # user.save()

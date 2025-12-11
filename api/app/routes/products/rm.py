"""
The removal method of the product object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess

from models.product import Product
from models.track import Track, TrackAction, TrackObject, changes_from_snapshot


router = APIRouter()


class ProductRemoveRequest(BaseModel):
    id: int = Field(..., description="Product id to delete", examples=[1])


@router.post("/rm/", tags=["products"])
async def handler(
    request: Request,
    data: ProductRemoveRequest = Body(...),
):
    """Delete product"""

    if request.state.status < 2:
        raise ErrorAccess("rm")

    product = Product.get(data.id)

    if request.state.status < 6 and product.token != request.state.token:
        raise ErrorAccess("rm")

    snapshot = product.json(
        fields={
            "id",
            "title",
            "price",
            "currency",
            "status",
            "category",
            "token",
        }
    )
    product.rm()

    Track.log(
        object=TrackObject.PRODUCT,
        action=TrackAction.REMOVE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": data.id,
            "changes": changes_from_snapshot(snapshot),
        },
    )

    return {"status": "ok"}

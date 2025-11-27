"""
The removal method of the product object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field
from consys.errors import ErrorAccess

from models.product import Product
from models.track import Track


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

    product.rm()

    Track(
        title="product_rm",
        data={"id": data.id},
        user=request.state.user,
        token=request.state.token,
        ip=request.state.ip,
    ).save()

    return {"status": "ok"}

"""
The creating and editing method of the product object of the API
"""

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict
from libdev.lang import to_url
from consys.errors import ErrorAccess

from models.product import Product
from .get import ProductResponse


router = APIRouter()


class ProductSaveRequest(BaseModel):
    """Payload for creating or updating a product"""

    model_config = ConfigDict(extra="forbid")

    id: int | None = Field(
        default=None,
        description="Product id to update. Omit for creating a new product",
        examples=[1],
    )
    title: str = Field(
        ...,
        description="Product title",
        examples=["Premium Wireless Headphones"],
    )
    description: str | None = Field(
        default=None,
        description="Short description of the product",
        examples=["High-quality wireless headphones with ANC"],
    )
    images: list[str] = Field(
        default_factory=list,
        description="Image URLs for the product gallery",
        examples=[["https://example.com/image.webp"]],
    )
    price: float = Field(
        default=0.0,
        ge=0,
        description="Current price",
        examples=[199.99],
    )
    original_price: float | None = Field(
        default=None,
        ge=0,
        description="Original price before discount",
        examples=[299.99],
    )
    currency: str | None = Field(
        default="$",
        description="Currency symbol or code",
        examples=["$"],
        max_length=8,
    )
    rating: float | None = Field(
        default=None,
        ge=0,
        le=5,
        description="Average rating",
        examples=[4.8],
    )
    rating_count: int | None = Field(
        default=None,
        ge=0,
        description="Number of ratings",
        examples=[234],
    )
    category: str | None = Field(
        default=None,
        description="Category label",
        examples=["Electronics"],
    )
    in_stock: bool = Field(
        default=True,
        description="Is the product available for purchase",
        examples=[True],
    )
    is_new: bool = Field(
        default=False,
        description="Marks product as new arrival",
        examples=[True],
    )
    is_featured: bool = Field(
        default=False,
        description="Marks product as featured",
        examples=[True],
    )
    discount: int | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Discount percentage",
        examples=[20],
    )
    status: int | None = Field(
        default=None,
        description="Product status flag",
        examples=[1],
    )


class ProductSaveResponse(BaseModel):
    id: int
    new: bool
    product: ProductResponse


def _serialize_product(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        title=product.title or "",
        description=product.description,
        images=product.images or [],
        price=float(product.price or 0),
        originalPrice=product.original_price,
        currency=product.currency,
        rating=product.rating,
        ratingCount=product.rating_count,
        category=product.category,
        inStock=product.in_stock,
        isNew=product.is_new,
        isFeatured=product.is_featured,
        discount=product.discount,
        url=product.url,
    )


@router.post("/save/", response_model=ProductSaveResponse, tags=["products"])
async def handler(
    request: Request,
    data: ProductSaveRequest = Body(...),
):
    """Create or update product"""

    if request.state.status < 2:
        raise ErrorAccess("save")

    new = False
    if data.id:
        product = Product.get(data.id)
    else:
        product = Product(
            token=request.state.token,
        )
        new = True

    product.title = data.title
    product.description = data.description
    product.images = data.images or []
    product.price = data.price
    product.original_price = data.original_price
    product.currency = data.currency
    product.rating = data.rating
    product.rating_count = data.rating_count
    product.category = data.category
    product.in_stock = data.in_stock
    product.is_new = data.is_new
    product.is_featured = data.is_featured
    product.discount = data.discount
    product.status = data.status

    product.save()

    # URL with id suffix for consistency
    url = to_url(product.title) or ""
    if url:
        url += "-"
    product.url = f"{url}{product.id}"
    product.save()

    return {
        "id": product.id,
        "new": new,
        "product": _serialize_product(product),
    }

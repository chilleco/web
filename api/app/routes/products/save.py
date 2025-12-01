"""
The creating and editing method of the product object of the API
"""

from typing import Any, Literal

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict
from libdev.lang import to_url
from consys.errors import ErrorAccess

from models.product import Product
from .get import ProductResponse, ProductFeature, serialize_product


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
        description="Base price before discounts",
        examples=[299.99],
    )
    discount_type: Literal["percent", "fixed"] | None = Field(
        default=None,
        description="Discount type applied to the base price",
        examples=["percent"],
    )
    discount_value: float | None = Field(
        default=None,
        ge=0,
        description="Discount value matched to type (percent or fixed amount)",
        examples=[25, 30.5],
    )
    features: list[ProductFeature] = Field(
        default_factory=list,
        description="List of key/value specifications for the product",
        examples=[[{"key": "Battery life", "value": "32h", "valueType": "string"}]],
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
    status: int | None = Field(
        default=None,
        description="Product status flag",
        examples=[1],
    )


class ProductSaveResponse(BaseModel):
    id: int
    new: bool
    product: ProductResponse


def _prepare_features_for_storage(features: list[ProductFeature]) -> list[dict[str, Any]]:
    """Convert feature payloads into a persisted structure."""

    prepared: list[dict[str, Any]] = []

    for feature in features:
        key = feature.key.strip()
        if not key:
            continue

        value_type = feature.valueType
        value: Any = feature.value

        if value_type == "number":
            value = float(value)
        elif value_type == "boolean":
            value = bool(value)
        else:
            value = "" if value is None else str(value)

        prepared.append(
            {
                "key": key,
                "value": value,
                "value_type": value_type,
            }
        )

    return sorted(prepared, key=lambda item: item["key"].lower())


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
    discount_type = data.discount_type if data.discount_type and (data.discount_value or 0) > 0 else None
    discount_value = float(data.discount_value or 0) if discount_type else 0.0

    product.title = data.title
    product.description = data.description
    product.images = data.images or []
    product.price = data.price
    product.discount_type = discount_type
    product.discount_value = discount_value
    product.currency = data.currency
    product.rating = data.rating
    product.rating_count = data.rating_count
    product.category = data.category
    product.in_stock = data.in_stock
    product.is_new = data.is_new
    product.is_featured = data.is_featured
    product.features = _prepare_features_for_storage(data.features)
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
        "product": serialize_product(product),
    }

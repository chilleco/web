"""
The creating and editing method of the product object of the API
"""

from typing import Any, Literal

from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from libdev.lang import to_url
from consys.errors import ErrorAccess

from models.product import Product
from models.track import Track, TrackAction, TrackObject, format_changes
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
    features: list[ProductFeature] = Field(
        default_factory=list,
        description="List of key/value specifications for the product",
        examples=[[{"key": "Battery life", "value": "32h", "valueType": "string"}]],
    )
    options: list["ProductOptionPayload"] = Field(
        default_factory=list,
        description="List of product modifications with their own pricing and availability",
    )
    currency: str | None = Field(
        default="$",
        description="Currency symbol or code",
        examples=["$"],
        max_length=8,
    )
    category: str | None = Field(
        default=None,
        description="Category label",
        examples=["Electronics"],
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


class ProductOptionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(
        ...,
        description="Readable option name (e.g., size or color)",
        examples=["Red / Large"],
    )
    price: float = Field(
        ...,
        ge=0,
        description="Base price before discounts",
        examples=[199.99],
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
    images: list[str] = Field(
        default_factory=list,
        description="Image URLs specific to the option",
        examples=[["https://example.com/variant.webp"]],
    )
    rating: float | None = Field(
        default=None,
        ge=0,
        le=5,
        description="Average rating for this option",
        examples=[4.8],
    )
    rating_count: int | None = Field(
        default=None,
        ge=0,
        description="Number of ratings for this option",
        examples=[234],
    )
    stock_count: int = Field(
        default=0,
        ge=0,
        description="Available stock count for the option",
        examples=[10],
        validation_alias=AliasChoices("stock_count", "stockCount"),
    )
    attributes: list[ProductFeature] = Field(
        default_factory=list,
        description="Key/value attributes for the option (size, color, etc.)",
    )
    features: list[ProductFeature] = Field(
        default_factory=list,
        description="Extra features specific to the option",
    )


ProductSaveRequest.model_rebuild()


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


def _prepare_option_for_storage(option: ProductOptionPayload) -> dict[str, Any]:
    """Normalize option payload for persistence."""

    discount_type = (
        option.discount_type if option.discount_type and (option.discount_value or 0) > 0 else None
    )
    discount_value = float(option.discount_value or 0) if discount_type else 0.0

    return {
        "name": option.name.strip() or "Option",
        "price": float(option.price or 0),
        "discount_type": discount_type,
        "discount_value": discount_value,
        "images": option.images or [],
        "rating": option.rating,
        "rating_count": option.rating_count,
        "stock_count": max(int(option.stock_count or 0), 0),
        "attributes": _prepare_features_for_storage(option.attributes),
        "features": _prepare_features_for_storage(option.features),
    }


@router.post("/save/", response_model=ProductSaveResponse, tags=["products"])
async def handler(
    request: Request,
    data: ProductSaveRequest = Body(...),
):
    """Create or update product"""

    if request.state.status < 2:
        raise ErrorAccess("save")

    new = False
    tracked_fields = {
        "id",
        "title",
        "description",
        "images",
        "price",
        "currency",
        "category",
        "in_stock",
        "is_new",
        "is_featured",
        "features",
        "options",
        "status",
        "token",
    }
    before_state = None
    if data.id:
        product = Product.get(data.id)
        before_state = product.json(fields=tracked_fields)
    else:
        product = Product(
            token=request.state.token,
        )
        new = True

    prepared_options = [_prepare_option_for_storage(option) for option in data.options]
    if not prepared_options:
        raise HTTPException(status_code=400, detail="options_required")

    price_from = min(option["price"] for option in prepared_options) if prepared_options else 0.0

    # Aggregate ratings across options (weighted by rating_count when available)
    rating_sum = 0.0
    rating_total = 0
    for option in prepared_options:
        rating = option.get("rating")
        rating_count = option.get("rating_count")
        if rating is not None and rating_count:
            rating_sum += float(rating) * int(rating_count)
            rating_total += int(rating_count)

    aggregated_rating = rating_sum / rating_total if rating_total else None
    aggregated_rating_count = rating_total if rating_total else None
    aggregated_in_stock = any((option.get("stock_count") or 0) > 0 for option in prepared_options)

    product.title = data.title
    product.description = data.description
    product.images = data.images or []
    product.price = price_from
    product.discount_type = None
    product.discount_value = 0.0
    product.currency = data.currency
    product.rating = aggregated_rating
    product.rating_count = aggregated_rating_count
    product.category = data.category
    product.in_stock = aggregated_in_stock
    product.is_new = data.is_new
    product.is_featured = data.is_featured
    product.features = _prepare_features_for_storage(data.features)
    product.options = prepared_options
    product.status = data.status

    changes = format_changes(product.get_changes())
    product.save()

    # URL with id suffix for consistency
    url = to_url(product.title) or ""
    if url:
        url += "-"
    product.url = f"{url}{product.id}"
    product.save()

    Track.log(
        object=TrackObject.PRODUCT,
        action=TrackAction.CREATE if new else TrackAction.UPDATE,
        user=request.state.user,
        token=request.state.token,
        request=request,
        params={
            "id": product.id,
            "before": before_state,
            "after": product.json(fields=tracked_fields),
            "changes": changes,
        },
    )

    return {
        "id": product.id,
        "new": new,
        "product": serialize_product(product),
    }

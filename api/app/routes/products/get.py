"""
The getting method of the product object of the API
"""

from typing import Iterable

from fastapi import APIRouter, Body, Request
from pydantic import BaseModel, Field, ConfigDict
from consys.errors import ErrorAccess

from lib import log
from models.product import Product


router = APIRouter()


SAMPLE_PRODUCTS = [
    {
        "id": 1,
        "title": "Premium Wireless Headphones",
        "description": "High-quality wireless headphones with active noise cancellation and superior sound quality. Perfect for music lovers and professionals.",
        "images": [
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
            "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400",
            "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=400",
        ],
        "price": 199.99,
        "original_price": 299.99,
        "currency": "$",
        "rating": 4.8,
        "rating_count": 234,
        "category": "Electronics",
        "in_stock": True,
        "is_new": True,
        "is_featured": True,
    },
    {
        "id": 2,
        "title": "Smart Fitness Tracker",
        "description": "Advanced fitness tracker with heart rate monitoring, GPS tracking, and 7-day battery life.",
        "images": [
            "https://images.unsplash.com/photo-1557935728-e6d1eaabe558?w=400",
            "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400",
        ],
        "price": 149.99,
        "currency": "$",
        "rating": 4.5,
        "rating_count": 189,
        "category": "Sports",
        "in_stock": True,
        "is_featured": True,
    },
    {
        "id": 3,
        "title": "Organic Coffee Blend",
        "description": "Premium organic coffee beans sourced from sustainable farms. Rich, bold flavor with notes of chocolate and caramel.",
        "images": ["https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400"],
        "price": 24.99,
        "currency": "$",
        "rating": 4.9,
        "rating_count": 156,
        "category": "Food & Beverage",
        "in_stock": True,
        "is_new": True,
    },
    {
        "id": 4,
        "title": "Professional Camera Lens",
        "description": "High-performance 85mm f/1.4 lens perfect for portrait photography with beautiful bokeh and sharp focus.",
        "images": [
            "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400",
            "https://images.unsplash.com/photo-1481447709470-dfd6f0d2c802?w=400",
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
        ],
        "price": 899.99,
        "original_price": 1199.99,
        "currency": "$",
        "rating": 4.7,
        "rating_count": 89,
        "category": "Photography",
        "in_stock": True,
    },
    {
        "id": 5,
        "title": "Eco-Friendly Water Bottle",
        "description": "Sustainable stainless steel water bottle that keeps drinks cold for 24 hours or hot for 12 hours.",
        "images": [
            "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400"
        ],
        "price": 34.99,
        "currency": "$",
        "rating": 4.6,
        "rating_count": 267,
        "category": "Lifestyle",
        "in_stock": True,
        "is_new": True,
    },
    {
        "id": 6,
        "title": "Gaming Mechanical Keyboard",
        "description": "RGB backlit mechanical keyboard with Cherry MX switches. Perfect for gaming and professional typing.",
        "images": [
            "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400",
            "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=400",
        ],
        "price": 129.99,
        "original_price": 159.99,
        "currency": "$",
        "rating": 4.4,
        "rating_count": 145,
        "category": "Gaming",
        "in_stock": False,
    },
    {
        "id": 7,
        "title": "Luxury Skincare Set",
        "description": "Complete skincare routine with premium ingredients including vitamin C serum, retinol cream, and hyaluronic acid.",
        "images": [
            "https://images.unsplash.com/photo-1556228578-dd6f2b34fa8a?w=400",
            "https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400",
            "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400",
        ],
        "price": 89.99,
        "currency": "$",
        "rating": 4.8,
        "rating_count": 203,
        "category": "Beauty",
        "in_stock": True,
        "is_featured": True,
    },
    {
        "id": 8,
        "title": "Smart Home Hub",
        "description": "Control all your smart devices from one central hub. Compatible with Alexa, Google Assistant, and Apple HomeKit.",
        "images": [
            "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400"
        ],
        "price": 79.99,
        "original_price": 99.99,
        "currency": "$",
        "rating": 4.3,
        "rating_count": 178,
        "category": "Smart Home",
        "in_stock": True,
    },
    {
        "id": 9,
        "title": "Designer Sunglasses",
        "description": "Premium polarized sunglasses with UV400 protection and lightweight titanium frame. Perfect for any occasion.",
        "images": [
            "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
            "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400",
        ],
        "price": 249.99,
        "currency": "$",
        "rating": 4.7,
        "rating_count": 134,
        "category": "Fashion",
        "in_stock": True,
        "is_new": True,
        "is_featured": True,
    },
]


class ProductsGetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int | list[int] | None = Field(
        default=None,
        description="Product id or list of ids to fetch",
        examples=[1, [1, 2, 3]],
    )
    search: str | None = Field(
        default=None,
        description="Search query applied to product title, description, or category",
        examples=["headphones"],
    )
    category: str | None = Field(
        default=None,
        description="Filter by category name",
        examples=["Electronics"],
    )
    limit: int = Field(
        default=12,
        ge=1,
        le=100,
        description="Maximum number of products to return",
        examples=[12],
    )
    offset: int = Field(
        default=0,
        ge=0,
        description="Offset for pagination",
        examples=[0],
    )


class ProductResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    images: list[str] = Field(default_factory=list)
    price: float
    originalPrice: float | None = None
    currency: str | None = None
    rating: float | None = None
    ratingCount: int | None = None
    category: str | None = None
    inStock: bool | None = None
    isNew: bool | None = None
    isFeatured: bool | None = None
    url: str | None = None


class ProductsGetResponse(BaseModel):
    products: list[ProductResponse]
    count: int


def _filter_products(products: list[dict], params: ProductsGetRequest) -> list[dict]:
    filtered = products

    if params.id is not None:
        ids = {params.id} if isinstance(params.id, int) else set(params.id)
        filtered = [product for product in filtered if product.get("id") in ids]

    if params.search:
        query = params.search.lower()
        filtered = [
            product
            for product in filtered
            if query in str(product.get("title", "")).lower()
            or query in str(product.get("description", "")).lower()
            or query in str(product.get("category", "")).lower()
        ]

    if params.category:
        category_query = params.category.lower()
        filtered = [
            product
            for product in filtered
            if category_query in str(product.get("category", "")).lower()
        ]

    return filtered


@router.post("/get/", response_model=ProductsGetResponse, tags=["products"])
async def handler(
    request: Request,
    data: ProductsGetRequest = Body(...),
):
    if request.state.status < 2:
        raise ErrorAccess("get")

    fields = {
        "id",
        "title",
        "description",
        "images",
        "price",
        "original_price",
        "currency",
        "rating",
        "rating_count",
        "category",
        "in_stock",
        "is_new",
        "is_featured",
        "url",
        "created",
        "updated",
        "status",
    }

    # Get
    params = dict(
        # FIXME: status={"$exists": False} if request.state.status < 5 else None,
    )
    products = Product.complex(
        ids=data.id,
        limit=data.limit,
        offset=data.offset,
        **params,
        fields=fields,
    )

    # Count
    count = None
    if not data.id:
        count = Product.count(**params)

    return {
        "products": products,
        "count": count,
    }

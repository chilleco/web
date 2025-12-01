from libdev.lang import to_url

from models import Base, Attribute


def default_url(instance):
    """Generate default URL slug based on title and id"""
    url = to_url(instance.title) or ""
    if url:
        url += "-"
    return url + f"{instance.id}"


class Product(Base):
    _name = "products"
    _search_fields = {"title", "description", "category"}

    title = Attribute(types=str)
    description = Attribute(types=str, default="")
    images = Attribute(types=list, default=list)
    price = Attribute(types=float, default=0.0)
    discount_type = Attribute(types=str)
    discount_value = Attribute(types=float)
    currency = Attribute(types=str, default="$")
    rating = Attribute(types=float)
    rating_count = Attribute(types=int)
    category = Attribute(types=str)
    in_stock = Attribute(types=bool, default=True)
    is_new = Attribute(types=bool, default=False)
    is_featured = Attribute(types=bool, default=False)
    features = Attribute(types=list)
    options = Attribute(types=list)
    url = Attribute(types=str, default=default_url)
    status = Attribute(types=int, default=1)
    token = Attribute(types=str)

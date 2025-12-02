from libdev.lang import get_pure

from lib.queue import get
from models import Base, Attribute


def default_description(instance):
    """Default description"""
    return get_pure(instance.data or "").split("\n")[0]


class Category(Base):
    _name = "categories"
    _search_fields = {"title", "data"}

    description = Attribute(types=str, default=default_description)
    parent = Attribute(types=int, default=0)
    url = Attribute(types=str)
    status = Attribute(types=int, default=1)
    token = Attribute(types=str)
    icon = Attribute(types=str)
    color = Attribute(types=str)

    @classmethod
    def get_tree(cls, categories=None, parent=None, ids=None, **kwargs):
        """Get tree of categories"""

        if categories is None:
            categories = cls.get(**kwargs)

        if ids is None and parent is None:
            parent = 0

        tree = []

        for category in categories:
            if ids and ids != category.id:
                continue
            if category.parent is None:
                category.parent = 0
            if parent is not None and category.parent != parent:
                continue

            data = category.json()
            data["categories"] = cls.get_tree(categories, category.id)

            tree.append(data)

        return tree

    @classmethod
    def get_childs(cls, parent):
        """Get childs of category"""
        childs_cache = get("category_childs") or {}

        if not childs_cache:
            # Build a fallback map when cache is empty or unavailable
            from services.cache import get_childs as build_childs, get_parents

            categories_tree = cls.get_tree(cls.get())
            childs_cache = build_childs(get_parents(categories_tree))

        return childs_cache.get(parent, []) + [parent]

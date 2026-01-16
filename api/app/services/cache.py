from collections import defaultdict

from lib.queue import save
from models.category import Category


def get_parents(categories_tree):
    """Get category parents"""

    if isinstance(categories_tree, (list, tuple)):
        categories = {}
        for category in categories_tree:
            for k, v in get_parents(category).items():
                categories[k] = v
        return categories

    categories = {
        categories_tree["id"]: [],
    }

    for category in categories_tree["categories"]:
        for k, v in get_parents(category).items():
            categories[k] = [categories_tree["id"]] + v

    return categories


def get_childs(category_parents):
    """Get category childs"""

    parents = defaultdict(list)

    for k, v in category_parents.items():
        for category in v:
            parents[category].append(k)

    return parents


async def cache_categories():
    """Cache categories"""

    categories = Category.get()
    categories_tree = Category.get_tree(categories)
    category_parents = get_parents(categories_tree)
    category_childs = get_childs(category_parents)
    category_ids = {category.id: category for category in categories}
    category_urls = {category.url: category for category in categories}

    await save("category_ids", category_ids)
    await save("category_urls", category_urls)
    await save("category_parents", category_parents)
    await save("category_childs", category_childs)

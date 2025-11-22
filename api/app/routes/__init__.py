"""
Attach all routers
"""

# TODO: hadnler on error in modules on import

import importlib
import pkgutil

from fastapi.routing import APIRouter

# pylint: disable=import-self
import routes


router = APIRouter()

for loader, module_name, is_pkg in pkgutil.walk_packages(
    routes.__path__, routes.__name__ + "."
):
    names = module_name.split(".")[1:-1]
    if not names:
        continue

    module = importlib.import_module(module_name)
    if not hasattr(module, "router"):
        continue

    # pylint: disable=invalid-name
    name = "/" + "/".join(names)
    router.include_router(module.router, prefix=name, tags=names)


__all__ = ("router",)

import dramatiq
from dramatiq.brokers.redis import RedisBroker
from libdev.cfg import cfg
from libdev.log import log


redis_broker = RedisBroker(
    url=f"redis://default:{cfg('REDIS_PASS')}@{cfg('REDIS_HOST')}:6379/2",
    middleware=[
        dramatiq.middleware.TimeLimit(time_limit=1_000_000_000),
        dramatiq.middleware.AsyncIO(),
    ],
)
dramatiq.set_broker(redis_broker)


# NOTE: there is for import dramatiq to activate it
# pylint: disable=wrong-import-position
from tasks.analytics import analytics
from tasks.sitemap import sitemap


@dramatiq.actor
async def ping():
    log.info("ping")


__all__ = [
    "ping",
    "analytics",
    "sitemap",
]

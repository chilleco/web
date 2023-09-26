"""
Monitoring
"""

import asyncio

from prometheus_client import Gauge

from models.user import User
from models.post import Post
from lib import report


metric_posts = Gauge('posts', 'Posts')
metric_users = Gauge('users', 'Users')


async def monitoring():
    """ Monitoring """
    metric_posts.set(Post.count())
    metric_users.set(User.count())

async def handle(_):
    """ Monitoring """

    while True:
        try:
            await monitoring()
        except Exception as e:  # pylint: disable=broad-except
            await report.critical(str(e), error=e)

        await asyncio.sleep(15)

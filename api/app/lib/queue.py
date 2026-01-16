"""
Message Queue
"""

import pickle

from libdev.cfg import cfg
from redis.asyncio import Redis


class Queue:
    """FIFO queue with Redis"""

    def __init__(self, broker, name):
        self.broker = broker
        self.name = name

    async def push(self, data):
        """Push data to queue"""
        await self.broker.rpush(self.name, pickle.dumps(data))

    async def pop(self):
        """Pop data from queue"""
        if not await self.length():
            return None
        result = await self.broker.blpop(self.name)
        if not result:
            return None
        return pickle.loads(result[1])

    async def pop_nowait(self):
        """Pop data without blocking"""
        data = await self.broker.lpop(self.name)
        if data is None:
            return None
        return pickle.loads(data)

    async def length(self):
        """Length of queue"""
        return await self.broker.llen(self.name)


redis = Redis(
    host=cfg("redis.host"),
    db=1,
    password=cfg("redis.pass"),
)


def queue(name):
    """Create queue object"""
    return Queue(redis, name)


async def expire(key, ttl):
    """Change expiration time"""
    try:
        await redis.expire(key, ttl)
    except Exception as e:  # pylint: disable=broad-except
        print("Redis expire error", e)


async def save(key, data, ttl=None):
    """Save value"""

    data = pickle.dumps(data)

    try:
        await redis.set(key, data)
    except Exception as e:  # pylint: disable=broad-except
        print("Redis save error", e)
        return

    if ttl is not None:
        await expire(key, ttl)


async def get(key, default=None):
    """Get value"""

    try:
        data = await redis.get(key)
    except Exception as e:  # pylint: disable=broad-except
        print("Redis get error", e)
        return default

    if data is None:
        return default

    return pickle.loads(data)


async def increment(key):
    try:
        return await redis.incr(key)
    except Exception as e:  # pylint: disable=broad-except
        print(f"Redis increment error: {e}")
        return None

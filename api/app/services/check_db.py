"""Read-only database preflight, run inside the deployed API container.

Uses the same Redis database and Mongo authentication settings as Taskiq and
ConSys. Report error classes only: server exceptions may include credentials.
"""

from __future__ import annotations

import asyncio
import sys

from libdev.cfg import cfg
from pymongo import AsyncMongoClient
from redis.asyncio import Redis


async def check_redis() -> bool:
    """Verify DNS, connectivity and authentication for the task queue."""
    try:
        async with Redis(
            host=cfg("redis.host") or "mq",
            port=6379,
            password=cfg("redis.pass"),
            db=2,
            socket_connect_timeout=5,
            socket_timeout=5,
        ) as client:
            await asyncio.wait_for(client.ping(), timeout=5)
    except Exception as exc:  # pylint: disable=broad-except
        print(
            f"Redis failed ({type(exc).__name__}). Check REDIS_HOST, REDIS_PASS "
            "and access to port 6379 from the Swarm containers.",
            file=sys.stderr,
        )
        return False
    print("Redis: OK")
    return True


async def check_mongo() -> bool:
    """Verify Mongo with ConSys's admin/SCRAM-SHA-1 authentication."""
    try:
        params = {
            "host": cfg("mongo.host") or "db",
            "port": 27017,
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 5000,
            "socketTimeoutMS": 5000,
        }
        login = cfg("mongo.user")
        password = cfg("mongo.pass")
        if login and password:
            params.update(
                username=login,
                password=password,
                authSource="admin",
                authMechanism="SCRAM-SHA-1",
            )
        async with AsyncMongoClient(**params) as client:
            await asyncio.wait_for(client.admin.command("ping"), timeout=5)
    except Exception as exc:  # pylint: disable=broad-except
        print(
            f"MongoDB failed ({type(exc).__name__}). Check MONGO_HOST, "
            "MONGO_USER, MONGO_PASS and database access from the Swarm containers.",
            file=sys.stderr,
        )
        return False
    print("MongoDB: OK")
    return True


async def check() -> bool:
    """Check both dependencies even when one is unavailable."""
    return all(await asyncio.gather(check_redis(), check_mongo()))


if __name__ == "__main__":
    raise SystemExit(0 if asyncio.run(check()) else 1)

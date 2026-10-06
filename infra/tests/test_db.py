"""Verify database preflight failure reporting without contacting real servers."""

import contextlib
import importlib.util
import io
from pathlib import Path
import sys
from types import ModuleType
import unittest
from unittest.mock import AsyncMock, Mock, patch


class Client:
    def __init__(self) -> None:
        self.ping = AsyncMock(return_value=True)
        self.admin = Mock(command=AsyncMock(return_value={"ok": 1}))
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        self.closed = True


class DatabaseTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.settings = {
            "redis.host": "redis.example",
            "redis.pass": "fixture-password",
            "mongo.host": "mongo.example:27018",
            "mongo.user": "fixture-user",
            "mongo.pass": "fixture-password",
        }
        self.redis = Client()
        self.mongo = Client()
        self.redis_factory = Mock(return_value=self.redis)
        self.mongo_factory = Mock(return_value=self.mongo)
        modules = {name: ModuleType(name) for name in ("libdev", "libdev.cfg", "pymongo", "redis", "redis.asyncio")}
        modules["libdev.cfg"].cfg = self.settings.get
        modules["redis.asyncio"].Redis = self.redis_factory
        modules["pymongo"].AsyncMongoClient = self.mongo_factory
        path = Path(__file__).resolve().parents[2] / "api/app/services/check_db.py"
        spec = importlib.util.spec_from_file_location("check_db", path)
        self.module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            spec.loader.exec_module(self.module)
        self.output = io.StringIO()
        self.error = io.StringIO()

    async def check(self) -> bool:
        with contextlib.redirect_stdout(self.output), contextlib.redirect_stderr(self.error):
            return await self.module.check()

    async def test_success_authenticates_and_closes_both_clients(self) -> None:
        self.assertTrue(await self.check())
        self.redis.ping.assert_awaited_once()
        self.mongo.admin.command.assert_awaited_once_with("ping")
        self.assertTrue(self.redis.closed)
        self.assertTrue(self.mongo.closed)
        self.assertEqual(self.redis_factory.call_args.kwargs["db"], 2)
        self.assertEqual(self.redis_factory.call_args.kwargs["port"], 6379)
        mongo = self.mongo_factory.call_args.kwargs
        self.assertEqual(mongo["host"], "mongo.example:27018")
        self.assertEqual(mongo["authSource"], "admin")
        self.assertEqual(mongo["authMechanism"], "SCRAM-SHA-1")
        self.assertEqual(mongo["serverSelectionTimeoutMS"], 5000)
        self.assertIn("Redis: OK", self.output.getvalue())
        self.assertIn("MongoDB: OK", self.output.getvalue())

    async def test_redis_failure_still_checks_mongo_and_redacts_server_message(self) -> None:
        self.redis.ping.side_effect = ConnectionError("fixture-password redis://secret")
        self.assertFalse(await self.check())
        self.mongo.admin.command.assert_awaited_once()
        self.assertIn("Redis failed (ConnectionError)", self.error.getvalue())
        self.assertIn("REDIS_HOST", self.error.getvalue())
        self.assertNotIn("fixture-password", self.error.getvalue())
        self.assertNotIn("redis://secret", self.error.getvalue())
        self.assertTrue(self.redis.closed)

    async def test_mongo_failure_still_checks_redis(self) -> None:
        self.mongo.admin.command.side_effect = TimeoutError("fixture-password")
        self.assertFalse(await self.check())
        self.redis.ping.assert_awaited_once()
        self.assertIn("MongoDB failed (TimeoutError)", self.error.getvalue())
        self.assertIn("MONGO_HOST", self.error.getvalue())
        self.assertNotIn("fixture-password", self.error.getvalue())
        self.assertTrue(self.mongo.closed)

    async def test_invalid_client_configuration_is_reported_without_traceback(self) -> None:
        self.mongo_factory.side_effect = ValueError("fixture-password")
        self.assertFalse(await self.check())
        self.assertIn("MongoDB failed (ValueError)", self.error.getvalue())
        self.assertNotIn("fixture-password", self.error.getvalue())
        self.assertNotIn("Traceback", self.error.getvalue())


if __name__ == "__main__":
    unittest.main()

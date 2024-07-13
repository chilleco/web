"""
Get variable middleware
"""

from aiogram import types
from aiogram.dispatcher.middlewares import BaseMiddleware

from lib import log


class VariablesMiddleware(BaseMiddleware):
    """Variables middleware"""

    async def on_process_message(self, message: types.Message, data: dict):
        """Message"""
        log.info("message")

    async def on_pre_process_callback_query(
        self,
        callback: types.CallbackQuery,
        data: dict,
    ):
        """Callback"""
        log.info("callback")

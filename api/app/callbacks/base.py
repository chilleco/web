from __future__ import annotations

from abc import ABCMeta, abstractmethod

from lib import log


class Callback(metaclass=ABCMeta):
    def __init__(self, entity, key, old, new, **kwargs):
        self.entity = entity
        self.key = key
        self.old = old
        self.new = new
        self.kwargs = kwargs

    async def validate(self) -> bool:
        return False

    @abstractmethod
    async def _execute(self) -> None:
        raise NotImplementedError

    async def execute(self) -> None:
        log.info(f"Executing {self.__class__.__name__}")
        if await self.validate():
            log.info(f"Validated {self.__class__.__name__}")
            await self._execute()
        log.info(f"Executed {self.__class__.__name__}")


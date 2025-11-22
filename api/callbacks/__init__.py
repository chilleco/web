from abc import ABCMeta, abstractmethod

from lib import log


class Callback(metaclass=ABCMeta):
    def __init__(self, entity, key, old, new, **kwargs):
        self.entity = entity
        self.key = key
        self.old = old
        self.new = new
        self.kwargs = kwargs

    def validate(self) -> bool:  # TODO: async
        return False

    @abstractmethod
    def _execute(self) -> None:  # TODO: async
        raise NotImplementedError

    def execute(self) -> None:  # TODO: async
        log.info(f"Executing {self.__class__.__name__}")
        if self.validate():
            log.info(f"Validated {self.__class__.__name__}")
            self._execute()
        log.info(f"Executed {self.__class__.__name__}")


from .bonus import (
    BonusReferrer,
)


__all__ = ("BonusReferrer",)

"""
Event hooks package.

The registry module imports event handlers to auto-register them.
"""

from tasks.event_base import EventHandler

__all__ = ("EventHandler",)

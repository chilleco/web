"""
Task definitions package.

`taskiq worker tasks.broker:broker tasks`
imports this module so all tasks are registered.
"""

# pylint: disable=wrong-import-position

from tasks.analytics import analytics
from tasks.callbacks import drain_model_callback_queue, process_model_callback_event
from tasks.periodic import run_periodic
from tasks.sitemap import sitemap
from tasks.system import ping

__all__ = (
    "analytics",
    "sitemap",
    "ping",
    "process_model_callback_event",
    "drain_model_callback_queue",
    "run_periodic",
)

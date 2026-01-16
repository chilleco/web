"""
Taskiq registration module.

Used by Taskiq worker/scheduler to import and register all tasks.
"""

# pylint: disable=wrong-import-position,unused-import

from tasks import process_model_event, reset_online_users, retry_model_events
from tasks.periodic.run_periodic import run_periodic
from tasks.scheduled.analytics import analytics
from tasks.scheduled.sitemap import sitemap
from tasks.system import ping

__all__ = (
    "analytics",
    "sitemap",
    "ping",
    "process_model_event",
    "retry_model_events",
    "reset_online_users",
    "run_periodic",
)

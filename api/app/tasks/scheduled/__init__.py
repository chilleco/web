"""
Scheduled tasks (cron/interval).
"""

from tasks.scheduled.analytics import analytics
from tasks.scheduled.sitemap import sitemap

__all__ = (
    "analytics",
    "sitemap",
)


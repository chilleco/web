"""
Telegram Reports & Alerts
"""

from libdev.cfg import cfg
from tgreports import Report


report = Report(cfg("mode"), cfg("tg.token"), cfg("bug_chat"))

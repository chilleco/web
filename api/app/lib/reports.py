"""
Telegram Reports & Alerts
"""

from libdev.cfg import cfg
from tgreports import Report


report = Report(
    cfg("mode"),
    cfg("tg.token"),
    cfg("bug_chat"),
    log_file="/logs/app.log",
    err_file="/logs/app.err",
)

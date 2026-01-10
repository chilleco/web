"""
Telegram Reports & Alerts
"""

from libdev.cfg import cfg
from tgreports import Report


report = Report(
    cfg("env"),
    cfg("tg.token"),
    cfg("bug_chat"),
    log_file=cfg("log_file", "/logs/app.log"),
    err_file=cfg("err_file", "/logs/app.err"),
)

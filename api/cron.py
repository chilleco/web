from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from lib import cfg
from tasks import ping, analytics, sitemap


if __name__ == "__main__":
    scheduler = BlockingScheduler()

    scheduler.add_job(
        ping.send,
        CronTrigger.from_crontab("* * * * *"),
    )

    # Only production tasks
    if cfg("mode") in {"PRE", "PROD"}:
        scheduler.add_job(
            analytics.send,
            CronTrigger.from_crontab("0 0 * * *"),
        )
        scheduler.add_job(
            sitemap.send,
            CronTrigger.from_crontab("0 * * * *"),
        )

    try:
        scheduler.start()
    except KeyboardInterrupt:
        scheduler.shutdown()

# TODO: recover Prometheus & Sockets
# import socketio
# from prometheus_client import start_http_server
# sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
# start_http_server(5000)

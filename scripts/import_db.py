"""
Import all project data from backup files to DB
"""

import os
import json

from consys._db import get_db
from libdev.cfg import cfg
from libdev.log import log


db = get_db(
    cfg("mongo.host", "db"),
    cfg("project_name"),
    cfg("mongo.user"),
    cfg("mongo.pass"),
)


dbs = [f[:-4] for f in os.listdir("/backup/") if f[-4:] == ".txt"]

for db_name in dbs:
    db[db_name].drop()

    with open(f"/backup/{db_name}.txt", "r", encoding="utf-8") as file:
        for row in file:
            try:
                db[db_name].insert_one(json.loads(row))
            except Exception as e:  # pylint: disable=broad-exception-caught
                log.error(f"{row}: {e}")

    log.success(db_name)

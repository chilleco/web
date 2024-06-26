"""
API Endpoints (Transport level)
"""

from fastapi import FastAPI, File
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from libdev.img import convert
from libdev.s3 import upload_file

from lib import cfg, report
from lib.sockets import asgi
from services.parameters import ParametersMiddleware
from services.monitoring import MonitoringMiddleware
from services.errors import ErrorsMiddleware
from services.access import AccessMiddleware
from services.limiter import get_uniq
from services.on_startup import on_startup


app = FastAPI(title=cfg("NAME", "API"), root_path="/api")


@app.on_event("startup")
async def startup():
    """Application startup event"""

    # Prometheus
    if cfg("mode") in {"PRE", "PROD"}:
        Instrumentator().instrument(app).expose(app)

    # Tasks on start
    on_startup()


# Limiter
# NOTE: 6st middleware
limits = ["25/second", "100/minute", "2500/hour", "10000/day"]
app.state.limiter = Limiter(key_func=get_uniq, default_limits=limits)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# JWT
# NOTE: 5st middleware
app.add_middleware(
    AccessMiddleware,
    jwt_secret=cfg("jwt"),
    whitelist={
        "/",
        "/account/token/",
        "/posts/get/",
        "/categories/get/",
        "/products/get/",  # FIXME
    },
)

# Errors
# NOTE: 4st middleware
app.add_middleware(ErrorsMiddleware)

# Monitoring
# NOTE: 3rd middleware
app.add_middleware(MonitoringMiddleware)

# Parameters
# NOTE: 2nd middleware
app.add_middleware(ParametersMiddleware)

# CORS
# NOTE: 1st middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Socket.IO
app.mount("/ws", asgi)


@app.get("/")
@app.post("/")
async def ping():
    """Ping"""
    return "OK"


@app.post("/upload/")
async def uploader(upload: bytes = File()):
    """Upload files to file server"""

    try:
        url = upload_file(convert(upload), file_type="webp")
    except Exception as e:  # pylint: disable=broad-except
        url = None
        await report.critical("Upload", error=e)

    return {
        "url": url,
    }


# pylint: disable=wrong-import-order,wrong-import-position,unused-import
import routes

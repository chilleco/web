import traceback

from fastapi import FastAPI, Request, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.errors import ServerErrorMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from libdev.img import convert
from libdev.s3 import upload

from lib import cfg, log, report
from lib.sockets import asgi
from services.parameters import ParametersMiddleware
from services.monitoring import MonitoringMiddleware
from services.errors import ErrorsMiddleware
from services.access import AccessMiddleware
from services.limiter import get_uniq
from services.on_startup import on_startup
from routes import router


log.add("/backup/app.log")  # FIXME: file (to tgreports)

app = FastAPI(title=cfg("NAME", "API"), root_path="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "api"}


@app.on_event("startup")
@log.catch
async def startup():
    """Application startup event"""

    # Report about start
    await report.info("Restart server")

    # Prometheus
    if cfg("mode") in {"PRE", "PROD"}:
        Instrumentator().instrument(app).expose(app)

    # Tasks on start
    await on_startup()


# Exceptions
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error = None
    message = None
    for err in exc.errors():
        error = err["loc"][-1]
        message = err["msg"]
        # err["type"]
        # err.get("input")
        break

    log.error(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "error": "ErrorValidation",
            "detail": error,
            "message": message,
        },
    )


@app.exception_handler(Exception)
async def uncaught_exception_handler(request: Request, exc: Exception):
    tb_str = "".join(traceback.format_tb(exc.__traceback__))
    log.error(f"Unhandled exception: {exc}\nTraceback: {tb_str}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": "ErrorCritical",
            "detail": str(exc),
        },
    )


# Limiter
# NOTE: 6th middleware
limits = ["25/second", "100/minute", "2500/hour", "10000/day"]
app.state.limiter = Limiter(key_func=get_uniq, default_limits=limits)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# JWT
# NOTE: 5th middleware
app.add_middleware(
    AccessMiddleware,
    jwt_secret=cfg("jwt"),
    whitelist={
        "/",
        "/users/token/",
        "/posts/get/",
        "/categories/get/",
        "/categories/save/",  # FIXME
        "/products/get/",  # FIXME
    },
)

# Errors
# NOTE: 4th middleware
app.add_middleware(ErrorsMiddleware)
app.add_middleware(ServerErrorMiddleware, handler=None)  # FIXME

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
async def uploader(data: bytes = File()):
    """Upload optimized images to S3"""
    url = await upload(await convert(data), file_type="webp")
    return {
        "url": url,
    }


app.include_router(router)

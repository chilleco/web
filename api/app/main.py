import traceback

from pathlib import Path

from fastapi import FastAPI, Request, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.errors import ServerErrorMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from consys.errors import BaseError
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
from services.sentry import flush_sentry
from routes import router


app = FastAPI(title=cfg("NAME", "api"), root_path="/api")


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
    if cfg("env") in {"pre", "prod"}:
        Instrumentator().instrument(app).expose(app)

    # Tasks on start
    await on_startup()


@app.on_event("shutdown")
async def shutdown():
    """Flush Sentry events on shutdown."""
    flush_sentry()


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
async def uploader(
    data: bytes = File(),
    name: str | None = Form(None),
):
    """Upload files to S3.

    - Images are converted to webp before uploading.
    - Non-images (or images that fail conversion) are uploaded as-is.
    """
    file_type = None
    if name:
        suffix = Path(name).suffix.lower().lstrip(".")
        if suffix:
            file_type = suffix

    converted: bytes | None = None
    try:
        converted = await convert(data)
    except Exception:  # pylint: disable=broad-except
        converted = None

    try:
        if converted:
            url = await upload(converted, file_type="webp")
        else:
            url = await upload(data, file_type=file_type or "bin")
    except Exception as exc:  # pylint: disable=broad-except
        # Normalize to a BaseError so middleware returns a 400 with detail
        raise BaseError(str(exc)) from exc

    return {
        "url": url,
    }


app.include_router(router)

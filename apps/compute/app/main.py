"""FastAPI compute service entry point."""
import hmac
import logging
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import close_pool, fetch_one
from app.settings import settings
from app.worker import start_worker, stop_worker, wake_event

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger("epilens.compute")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycle."""
    logger.info("Starting EpiLens Compute service (rev: %s)", settings.CODE_REVISION)
    start_worker()
    try:
        yield
    finally:
        logger.info("Shutting down EpiLens Compute service")
        stop_worker()
        close_pool()


app = FastAPI(
    title="EpiLens Compute API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_and_error_middleware(request: Request, call_next) -> Response:
    """Inject request ID and ensure standardized error envelopes on unhandled errors."""
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:10]}"
    try:
        response: Response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
    except Exception:
        err_ref = f"err_{uuid.uuid4().hex[:8]}"
        logger.exception("Unhandled error in compute service (ref: %s)", err_ref)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": f"Compute internal error. Reference: {err_ref}",
                    "request_id": request_id,
                }
            },
            headers={"x-request-id": request_id},
        )


def verify_internal_secret(x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret")) -> None:
    """Verify internal shared secret using constant-time comparison."""
    if not x_internal_secret or not hmac.compare_digest(
        x_internal_secret.encode("utf-8"),
        settings.COMPUTE_SHARED_SECRET.encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: invalid or missing internal secret",
        )


@app.get("/health")
def health() -> dict[str, bool]:
    """Lightweight liveness check (does not touch database)."""
    return {"ok": True}


@app.get("/health/db")
def health_db() -> dict[str, bool]:
    """Database connectivity probe."""
    try:
        row = fetch_one("SELECT 1 as alive")
        db_alive = row is not None and row.get("alive") == 1
        return {"ok": True, "db": db_alive}
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable",
        ) from exc


@app.post("/internal/jobs/wake")
def wake_jobs(_: None = verify_internal_secret) -> dict[str, bool]:
    """Wake background worker thread to start active polling."""
    wake_event.set()
    return {"ok": True, "woken": True}


@app.post("/internal/selftest")
def create_selftest_job(_: None = verify_internal_secret) -> dict[str, str]:
    """Enqueue a SELFTEST job and wake worker."""
    job_id = f"job_test_{uuid.uuid4().hex[:12]}"
    try:
        fetch_one(
            """
            INSERT INTO jobs (id, type, ref_id, status, created_at, updated_at)
            VALUES (%(id)s, 'SELFTEST', %(ref_id)s, 'QUEUED', now(), now())
            RETURNING id
            """,
            {"id": job_id, "ref_id": job_id},
        )
    except Exception as exc:
        logger.error("Failed to enqueue selftest job: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enqueue selftest job",
        ) from exc

    wake_event.set()
    return {"job_id": job_id, "status": "QUEUED"}

"""FastAPI compute service entry point."""
import hmac
import logging
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, Any

import jwt
from fastapi import (
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.data.csv_io import CsvValidationError
from app.data.service import (
    confirm_dataset,
    create_upload_dataset,
    fetch_archive_snapshot,
    import_bundled,
)
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
def wake_jobs(_: Annotated[None, Depends(verify_internal_secret)]) -> dict[str, bool]:
    """Wake background worker thread to start active polling."""
    wake_event.set()
    return {"ok": True, "woken": True}


@app.post("/internal/selftest")
def create_selftest_job(_: Annotated[None, Depends(verify_internal_secret)]) -> dict[str, str]:
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


# ---------------------------------------------------------
# Dataset Routes (Upload, Confirm, Bundled, Archive)
# ---------------------------------------------------------


def verify_upload_token(authorization: Annotated[str | None, Header()] = None) -> dict[str, Any]:
    """Verify signed short-lived JWT for direct CSV upload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Bearer authorization token",
        )
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.COMPUTE_SHARED_SECRET, algorithms=["HS256"])
        if payload.get("scope") != "dataset:upload":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token scope for dataset upload",
            )
        return payload
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired upload token: {exc}",
        ) from exc


@app.post("/public/datasets/upload")
async def direct_upload_dataset(
    file: Annotated[UploadFile, File()],
    token_payload: Annotated[dict[str, Any], Depends(verify_upload_token)],
) -> dict[str, Any]:
    """Direct CSV file upload from the browser with signed JWT."""
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum 10 MB limit",
        )

    try:
        res = create_upload_dataset(user_id=user_id, filename=file.filename or "dataset.csv", content=content)
        return res
    except CsvValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message, "details": exc.details},
        ) from exc


class ConfirmDatasetPayload(BaseModel):
    user_id: str
    column_mapping: dict[str, str]
    date_range: tuple[str, str] | None = None
    population: int | None = None


@app.post("/internal/datasets/{dataset_id}/confirm")
def internal_confirm_dataset(
    dataset_id: str,
    payload: ConfirmDatasetPayload,
    _: Annotated[None, Depends(verify_internal_secret)],
) -> dict[str, Any]:
    """Confirm column mapping and date range, run normalization, and save observations."""
    try:
        return confirm_dataset(
            user_id=payload.user_id,
            dataset_id=dataset_id,
            column_mapping=payload.column_mapping,
            date_range=payload.date_range,
            population=payload.population,
        )
    except CsvValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message, "details": exc.details},
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


class ImportBundledPayload(BaseModel):
    user_id: str
    source_key: str


@app.post("/internal/datasets/import-bundled")
def internal_import_bundled(
    payload: ImportBundledPayload,
    _: Annotated[None, Depends(verify_internal_secret)],
) -> dict[str, Any]:
    """Import bundled Punjab archive or synthetic demo data for a user."""
    try:
        return import_bundled(user_id=payload.user_id, source_key=payload.source_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


class FetchArchivePayload(BaseModel):
    user_id: str
    start_date: str | None = None
    end_date: str | None = None


@app.post("/internal/datasets/fetch-archive")
def internal_fetch_archive(
    payload: FetchArchivePayload,
    _: Annotated[None, Depends(verify_internal_secret)],
) -> dict[str, Any]:
    """Fetch snapshot from allowlisted data.covid19india.org for a user."""
    return fetch_archive_snapshot(
        user_id=payload.user_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

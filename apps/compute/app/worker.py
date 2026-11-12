"""Cost-aware PostgreSQL background job worker."""
import logging
import os
import socket
import threading
import time
from collections.abc import Callable
from typing import Any

from app.db import execute, fetch_one

logger = logging.getLogger("epilens.worker")

# Global threading event for sleeping and waking
wake_event = threading.Event()
_worker_thread: threading.Thread | None = None
_stop_event = threading.Event()

WORKER_ID = f"{socket.gethostname()}-{os.getpid()}"

# Handler registry
HandlerFunc = Callable[[dict[str, Any]], None]
HANDLERS: dict[str, HandlerFunc] = {}


def register_handler(job_type: str, handler: HandlerFunc) -> None:
    """Register a handler for a given JobType."""
    HANDLERS[job_type] = handler


def update_heartbeat(job_id: str) -> None:
    """Touch job heartbeat timestamp."""
    execute(
        "UPDATE jobs SET heartbeat_at = now(), updated_at = now() WHERE id = %(id)s",
        {"id": job_id},
    )


def handle_selftest(job: dict[str, Any]) -> None:
    """Execute SELFTEST job: 3x1s sleep updating heartbeat, then mark DONE."""
    job_id = job["id"]
    logger.info("Executing SELFTEST job %s", job_id)
    for _ in range(3):
        time.sleep(1)
        update_heartbeat(job_id)

    execute(
        "UPDATE jobs SET status = 'DONE', updated_at = now() WHERE id = %(id)s",
        {"id": job_id},
    )
    logger.info("SELFTEST job %s completed successfully", job_id)


register_handler("SELFTEST", handle_selftest)
import app.jobs  # noqa: F401


def run_reaper() -> None:
    """Reap stalled RUNNING jobs whose heartbeat is older than 60s."""
    try:
        # Re-queue jobs that haven't exceeded max_attempts
        execute(
            """
            UPDATE jobs
            SET status = 'QUEUED', locked_at = NULL, locked_by = NULL, updated_at = now()
            WHERE status = 'RUNNING'
              AND heartbeat_at < now() - interval '60 seconds'
              AND attempts < max_attempts
            """
        )
        # Fail jobs that have reached max_attempts
        execute(
            """
            UPDATE jobs
            SET status = 'FAILED',
                last_error = 'Worker stalled or terminated (heartbeat exceeded 60s timeout)',
                updated_at = now()
            WHERE status = 'RUNNING'
              AND heartbeat_at < now() - interval '60 seconds'
              AND attempts >= max_attempts
            """
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Error running job reaper: %s", e)


def claim_next_job() -> dict[str, Any] | None:
    """Atomically claim the oldest QUEUED job using FOR UPDATE SKIP LOCKED."""
    query = """
        UPDATE jobs
        SET status = 'RUNNING',
            locked_at = now(),
            locked_by = %(w)s,
            heartbeat_at = now(),
            attempts = attempts + 1,
            updated_at = now()
        WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'QUEUED'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        RETURNING *;
    """
    try:
        return fetch_one(query, {"w": WORKER_ID})
    except Exception as e:  # noqa: BLE001
        logger.error("Error claiming job: %s", e)
        return None


def execute_job(job: dict[str, Any]) -> None:
    """Dispatch job to its registered handler."""
    job_id = job["id"]
    job_type = job["type"]
    handler = HANDLERS.get(job_type)

    if not handler:
        msg = f"Job handler for type '{job_type}' not implemented"
        logger.warning(msg)
        execute(
            "UPDATE jobs SET status = 'FAILED', last_error = %(err)s, updated_at = now() WHERE id = %(id)s",
            {"id": job_id, "err": msg},
        )
        return

    try:
        handler(job)
    except Exception as exc:
        logger.exception("Job %s failed with exception", job_id)
        execute(
            "UPDATE jobs SET status = 'FAILED', last_error = %(err)s, updated_at = now() WHERE id = %(id)s",
            {"id": job_id, "err": str(exc)},
        )


def worker_loop() -> None:
    """Main worker thread loop: sleeps when idle, active polling when woken."""
    logger.info("Compute worker thread started (%s)", WORKER_ID)

    while not _stop_event.is_set():
        # Sleep on event: zero DB queries while idle.
        # Woken by /internal/jobs/wake or 30-min safety interval.
        woken = wake_event.wait(timeout=1800)
        if _stop_event.is_set():
            break

        if woken:
            logger.info("Worker woken by wake event, entering active polling")
        else:
            logger.info("Worker running periodic 30-min safety check")

        empty_streak = 0
        while not _stop_event.is_set():
            run_reaper()
            job = claim_next_job()

            if job:
                empty_streak = 0
                execute_job(job)
            else:
                empty_streak += 1
                if empty_streak >= 15:
                    logger.info("Job queue empty for 15s. Worker returning to idle sleep.")
                    wake_event.clear()
                    break
                time.sleep(1)


def start_worker() -> None:
    """Start background worker thread."""
    global _worker_thread
    _stop_event.clear()
    _worker_thread = threading.Thread(target=worker_loop, daemon=True, name="ComputeWorker")
    _worker_thread.start()


def stop_worker() -> None:
    """Signal background worker to terminate."""
    _stop_event.set()
    wake_event.set()
    if _worker_thread and _worker_thread.is_alive():
        _worker_thread.join(timeout=3)

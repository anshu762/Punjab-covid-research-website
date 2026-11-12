"""Job handler for JobType.SENSITIVITY."""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from app.db import execute, fetch_one
from app.sensitivity import evaluate_27_combinations
from app.worker import register_handler, update_heartbeat

logger = logging.getLogger("epilens.jobs.sensitivity")


def handle_sensitivity_job(job: dict[str, Any]) -> None:
    """Execute 27-combination sensitivity analysis dispatched by worker."""
    run_id = job["ref_id"]
    job_id = job["id"]

    logger.info("Executing SENSITIVITY job %s for run %s", job_id, run_id)

    # 1. Fetch parent fit payload
    fit_row = fetch_one(
        """
        SELECT fr.payload, r.status
        FROM fit_results fr
        JOIN runs r ON r.id = fr.run_id
        WHERE fr.run_id = %(run_id)s
        """,
        {"run_id": run_id},
    )
    if not fit_row or fit_row.get("status") != "COMPLETED":
        error_msg = f"Run {run_id} is not completed or has no fit result"
        logger.error(error_msg)
        execute(
            "UPDATE jobs SET status = 'FAILED', last_error = %(err)s, updated_at = now() WHERE id = %(jid)s",
            {"jid": job_id, "err": error_msg},
        )
        return

    raw_payload = fit_row["payload"]
    payload = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload

    update_heartbeat(job_id)

    def progress_callback(done: int, total: int) -> None:
        update_heartbeat(job_id)

    try:
        results = evaluate_27_combinations(
            parent_payload=payload,
            progress_callback=progress_callback,
        )

        update_heartbeat(job_id)

        # Upsert into sensitivity_results table
        execute(
            """
            INSERT INTO sensitivity_results (run_id, combos, summary, created_at)
            VALUES (%(rid)s, %(combos)s::jsonb, %(summary)s::jsonb, now())
            ON CONFLICT (run_id) DO UPDATE SET
                combos = EXCLUDED.combos,
                summary = EXCLUDED.summary,
                created_at = now()
            """,
            {
                "rid": run_id,
                "combos": json.dumps(results["combos"]),
                "summary": json.dumps(results["summary"]),
            },
        )

        # Mark job as DONE
        execute("UPDATE jobs SET status = 'DONE', updated_at = now() WHERE id = %(jid)s", {"jid": job_id})
        logger.info("SENSITIVITY job %s for run %s completed successfully", job_id, run_id)

    except Exception as exc:
        logger.exception("SENSITIVITY job %s failed", job_id)
        err_ref = f"ERR-SENS-{uuid.uuid4().hex[:8].upper()}"
        execute(
            """
            UPDATE jobs
            SET status = 'FAILED',
                last_error = %(err)s,
                updated_at = now()
            WHERE id = %(jid)s
            """,
            {"jid": job_id, "err": f"[{err_ref}] {exc}"},
        )


# Register handler for SENSITIVITY jobs
register_handler("SENSITIVITY", handle_sensitivity_job)

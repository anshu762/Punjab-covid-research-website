"""Job handler for JobType.SCENARIO."""
import json
import logging
import uuid
from typing import Any

from app.db import execute, fetch_one
from app.scenarios.engine import run_scenario_simulation
from app.worker import register_handler, update_heartbeat

logger = logging.getLogger("epilens.jobs.scenario")


def handle_scenario_job(job: dict[str, Any]) -> None:
    """Execute scenario simulation dispatched by background job worker."""
    scenario_id = job["ref_id"]
    job_id = job["id"]

    logger.info("Executing SCENARIO job %s for scenario %s", job_id, scenario_id)

    # 1. Fetch scenario details
    scenario = fetch_one(
        "SELECT id, parent_run_id, percent_change, horizon_days, config FROM scenarios WHERE id = %(id)s",
        {"id": scenario_id},
    )
    if not scenario:
        error_msg = f"Scenario {scenario_id} not found"
        logger.error(error_msg)
        execute(
            "UPDATE jobs SET status = 'FAILED', last_error = %(err)s, updated_at = now() WHERE id = %(jid)s",
            {"jid": job_id, "err": error_msg},
        )
        return

    # Update scenario to RUNNING
    execute(
        "UPDATE scenarios SET status = 'RUNNING' WHERE id = %(id)s",
        {"id": scenario_id},
    )
    update_heartbeat(job_id)

    try:
        parent_run_id = scenario["parent_run_id"]
        percent_change = int(scenario["percent_change"])
        horizon_days = int(scenario["horizon_days"])

        # 2. Fetch parent fit payload
        fit_row = fetch_one(
            """
            SELECT fr.payload, r.status
            FROM fit_results fr
            JOIN runs r ON r.id = fr.run_id
            WHERE fr.run_id = %(run_id)s
            """,
            {"run_id": parent_run_id},
        )
        if not fit_row or fit_row.get("status") != "COMPLETED":
            raise RuntimeError(
                f"Parent run {parent_run_id} is not completed or has no fit result."
            )

        raw_payload = fit_row["payload"]
        parent_payload = (
            json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
        )

        update_heartbeat(job_id)

        # 3. Compute scenario
        results = run_scenario_simulation(
            parent_payload=parent_payload,
            percent_change=percent_change,
            horizon_days=horizon_days,
        )

        update_heartbeat(job_id)

        # 4. Save results to scenarios table
        execute(
            """
            UPDATE scenarios
            SET status = 'COMPLETED',
                daily_outputs = %(daily)s::jsonb,
                summary = %(summary)s::jsonb,
                completed_at = now(),
                error_reference = NULL,
                error_message = NULL
            WHERE id = %(id)s
            """,
            {
                "id": scenario_id,
                "daily": json.dumps(results["dailyOutputs"]),
                "summary": json.dumps(results["summary"]),
            },
        )

        # 5. Mark job as DONE
        execute(
            "UPDATE jobs SET status = 'DONE', updated_at = now() WHERE id = %(jid)s",
            {"jid": job_id},
        )
        logger.info("SCENARIO job %s for scenario %s completed successfully", job_id, scenario_id)

    except Exception as exc:  # noqa: BLE001
        logger.exception("SCENARIO job %s failed: %s", job_id, exc)
        err_ref = f"ERR-SCEN-{uuid.uuid4().hex[:8].upper()}"
        err_msg = str(exc)

        execute(
            """
            UPDATE scenarios
            SET status = 'FAILED',
                error_reference = %(ref)s,
                error_message = %(msg)s,
                completed_at = now()
            WHERE id = %(id)s
            """,
            {"id": scenario_id, "ref": err_ref, "msg": err_msg},
        )

        execute(
            """
            UPDATE jobs
            SET status = 'FAILED',
                last_error = %(err)s,
                updated_at = now()
            WHERE id = %(jid)s
            """,
            {"jid": job_id, "err": f"[{err_ref}] {err_msg}"},
        )


# Register handler for SCENARIO jobs
register_handler("SCENARIO", handle_scenario_job)

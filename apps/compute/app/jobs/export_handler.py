"""Job handler for JobType.EXPORT."""
from __future__ import annotations

import hashlib
import json
import logging
import uuid
from typing import Any

from app.db import execute, fetch_one
from app.exports.bundle import build_reproducibility_bundle
from app.exports.csv_builders import (
    build_cleaned_dataset_csv,
    build_correction_log_csv,
    build_fitted_states_csv,
    build_forecasts_csv,
    build_metrics_csv,
    build_scenario_csv,
)
from app.exports.figures import render_observed_and_fitted_figure, render_scenario_figure
from app.worker import register_handler, update_heartbeat

logger = logging.getLogger("epilens.jobs.export")


def handle_export_job(job: dict[str, Any]) -> None:
    """Execute file/bundle export dispatched by background worker."""
    export_id = job["ref_id"]
    job_id = job["id"]

    logger.info("Executing EXPORT job %s for export %s", job_id, export_id)

    export_row = fetch_one(
        "SELECT id, owner_id, run_id, scenario_id, type FROM exports WHERE id = %(id)s",
        {"id": export_id},
    )
    if not export_row:
        error_msg = f"Export record {export_id} not found"
        logger.error(error_msg)
        execute(
            "UPDATE jobs SET status = 'FAILED', last_error = %(err)s, updated_at = now() WHERE id = %(jid)s",
            {"jid": job_id, "err": error_msg},
        )
        return

    # Update export status to RUNNING
    execute("UPDATE exports SET status = 'RUNNING' WHERE id = %(id)s", {"id": export_id})
    update_heartbeat(job_id)

    try:
        owner_id = export_row["owner_id"]
        run_id = export_row["run_id"]
        scenario_id = export_row.get("scenario_id")
        export_type = export_row["type"]

        # Fetch parent run and dataset
        run_row = fetch_one(
            """
            SELECT r.id, r.dataset_id, r.display_name, r.mode, r.model_type,
                   r.code_version, r.seed, r.config, r.status
            FROM runs r
            WHERE r.id = %(id)s
            """,
            {"id": run_id},
        )
        if not run_row:
            raise RuntimeError(f"Run {run_id} not found")

        dataset_id = run_row["dataset_id"]
        dataset_row = fetch_one(
            "SELECT id, name, version, sha256, is_synthetic FROM datasets WHERE id = %(id)s",
            {"id": dataset_id},
        ) or {}

        # Fetch fit payload if completed
        fit_row = fetch_one(
            "SELECT payload FROM fit_results WHERE run_id = %(id)s",
            {"id": run_id},
        )
        raw_payload = fit_row["payload"] if fit_row else {}
        payload = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload

        update_heartbeat(job_id)

        file_content: bytes
        filename: str
        mime_type: str
        manifest_json: str | None = None

        run_prefix = run_id[:8]

        if export_type == "BUNDLE_ZIP":
            zip_bytes, manifest, checksum = build_reproducibility_bundle(
                run_row=run_row,
                payload=payload,
                dataset_row=dataset_row,
            )
            file_content = zip_bytes
            filename = f"epilens_bundle_{run_prefix}.zip"
            mime_type = "application/zip"
            manifest_json = json.dumps(manifest)

        elif export_type == "CLEANED_DATASET_CSV":
            csv_str = build_cleaned_dataset_csv(dataset_id)
            file_content = csv_str.encode("utf-8")
            filename = f"epilens_cleaned_data_{run_prefix}.csv"
            mime_type = "text/csv"

        elif export_type == "CORRECTION_LOG_CSV":
            csv_str = build_correction_log_csv(dataset_id)
            file_content = csv_str.encode("utf-8")
            filename = f"epilens_anomaly_log_{run_prefix}.csv"
            mime_type = "text/csv"

        elif export_type == "FITTED_STATES_CSV":
            csv_str = build_fitted_states_csv(payload)
            file_content = csv_str.encode("utf-8")
            filename = f"epilens_fitted_states_{run_prefix}.csv"
            mime_type = "text/csv"

        elif export_type == "FORECASTS_CSV":
            csv_str = build_forecasts_csv(run_id)
            file_content = csv_str.encode("utf-8")
            filename = f"epilens_forecasts_{run_prefix}.csv"
            mime_type = "text/csv"

        elif export_type == "METRICS_CSV":
            csv_str = build_metrics_csv(payload)
            file_content = csv_str.encode("utf-8")
            filename = f"epilens_metrics_{run_prefix}.csv"
            mime_type = "text/csv"

        elif export_type == "FIGURE_PNG":
            file_content = render_observed_and_fitted_figure(payload, format="png")
            filename = f"epilens_figure_{run_prefix}.png"
            mime_type = "image/png"

        elif export_type == "FIGURE_SVG":
            file_content = render_observed_and_fitted_figure(payload, format="svg")
            filename = f"epilens_figure_{run_prefix}.svg"
            mime_type = "image/svg+xml"

        elif export_type == "SCENARIO_CSV" and scenario_id:
            scen_row = fetch_one(
                "SELECT daily_outputs, summary FROM scenarios WHERE id = %(id)s",
                {"id": scenario_id},
            )
            if not scen_row:
                raise RuntimeError(f"Scenario {scenario_id} not found")
            csv_str = build_scenario_csv(scen_row)
            file_content = csv_str.encode("utf-8")
            filename = f"epilens_scenario_{scenario_id[:8]}.csv"
            mime_type = "text/csv"

        else:
            raise ValueError(f"Unsupported export type: {export_type}")

        update_heartbeat(job_id)

        # Store file in stored_files table
        file_id = f"file_{uuid.uuid4().hex[:16]}"
        file_sha256 = hashlib.sha256(file_content).hexdigest()
        file_size = len(file_content)

        execute(
            """
            INSERT INTO stored_files (
                id, owner_id, dataset_id, run_id, kind, filename, mime_type, size_bytes, sha256, content
            )
            VALUES (
                %(id)s, %(oid)s, %(did)s, %(rid)s, %(kind)s, %(fn)s, %(mime)s, %(sz)s, %(sha)s, %(cnt)s
            )
            """,
            {
                "id": file_id,
                "oid": owner_id,
                "did": dataset_id,
                "rid": run_id,
                "kind": export_type,
                "fn": filename,
                "mime": mime_type,
                "sz": file_size,
                "sha": file_sha256,
                "cnt": file_content,
            },
        )

        # Update export record to READY
        execute(
            """
            UPDATE exports
            SET status = 'READY',
                file_id = %(fid)s,
                checksum = %(sha)s,
                manifest = %(man)s::jsonb,
                expires_at = now() + interval '7 days'
            WHERE id = %(eid)s
            """,
            {
                "eid": export_id,
                "fid": file_id,
                "sha": file_sha256,
                "man": manifest_json,
            },
        )

        # Mark job as DONE
        execute("UPDATE jobs SET status = 'DONE', updated_at = now() WHERE id = %(jid)s", {"jid": job_id})
        logger.info("EXPORT job %s completed. File %s (%d bytes)", job_id, filename, file_size)

    except Exception as exc:  # noqa: BLE001
        logger.exception("EXPORT job %s failed: %s", job_id, exc)
        err_ref = f"ERR-EXP-{uuid.uuid4().hex[:8].upper()}"
        execute(
            """
            UPDATE exports
            SET status = 'FAILED',
                error_reference = %(ref)s
            WHERE id = %(id)s
            """,
            {"id": export_id, "ref": err_ref},
        )
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


# Register handler for EXPORT jobs
register_handler("EXPORT", handle_export_job)

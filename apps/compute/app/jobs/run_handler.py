"""Job handler for JobType.RUN."""
from typing import Any

from app.runner import execute_run
from app.worker import register_handler


def handle_run_job(job: dict[str, Any]) -> None:
    """Execute analysis run dispatched by job worker."""
    run_id = job["ref_id"]
    job_id = job["id"]
    execute_run(run_id=run_id, job_id=job_id)


# Register handler for RUN jobs
register_handler("RUN", handle_run_job)

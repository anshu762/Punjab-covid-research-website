"""CLI tool for EpiLens compute service operations."""
import argparse
import json
import sys
import uuid

from app.config import (
    AdvancedConfig,
    DateRange,
    PopulationProvenance,
    RunConfig,
    compute_cache_key,
    compute_config_hash,
    get_code_version,
)
from app.db import fetch_one, get_connection
from app.runner import execute_run


def cmd_run(args: argparse.Namespace) -> None:
    """Run empirical model fit or forecast evaluation from CLI."""
    dataset_id = args.dataset
    mode = args.mode.upper()
    model_type = args.model.upper()

    with get_connection() as conn, conn.cursor() as cur:
        if not dataset_id:
            # Find the first READY dataset
            cur.execute(
                "SELECT id, owner_id, population_value, population_source_url, "
                "population_reference_year, population_geography "
                "FROM datasets WHERE status = 'READY' ORDER BY created_at DESC LIMIT 1"
            )
            ds_row = cur.fetchone()
            if not ds_row:
                print("Error: No READY dataset found in database. Specify --dataset <id>", file=sys.stderr)
                sys.exit(1)
            dataset_id = ds_row[0]
            owner_id = ds_row[1]
            pop_val = ds_row[2] or 30000000
            pop_url = ds_row[3] or "https://censusindia.gov.in/punjab"
            pop_year = ds_row[4] or 2020
            pop_geo = ds_row[5] or "Punjab, India"
        else:
            cur.execute(
                "SELECT owner_id, population_value, population_source_url, "
                "population_reference_year, population_geography "
                "FROM datasets WHERE id = %(id)s",
                {"id": dataset_id},
            )
            ds_row = cur.fetchone()
            if not ds_row:
                print(f"Error: Dataset {dataset_id} not found", file=sys.stderr)
                sys.exit(1)
            owner_id = args.user or ds_row[0]
            pop_val = ds_row[1] or 30000000
            pop_url = ds_row[2] or "https://censusindia.gov.in/punjab"
            pop_year = ds_row[4] or 2020
            pop_geo = ds_row[5] or "Punjab, India"

        # Determine date range from observations
        cur.execute(
            "SELECT min(to_char(date, 'YYYY-MM-DD')), max(to_char(date, 'YYYY-MM-DD')) "
            "FROM observations WHERE dataset_id = %(id)s",
            {"id": dataset_id},
        )
        d_min, d_max = cur.fetchone()
        if not d_min or not d_max:
            print(f"Error: Dataset {dataset_id} has no observations", file=sys.stderr)
            sys.exit(1)

        # Build config
        cfg = RunConfig(
            datasetId=dataset_id,
            dateRange=DateRange(start=d_min, end=d_max),
            population=PopulationProvenance(
                value=pop_val,
                sourceUrl=pop_url,
                referenceYear=pop_year,
                geography=pop_geo,
            ),
            mode=mode,
            modelType=model_type,
            advanced=AdvancedConfig(nStarts=5, cpSearchStarts=3),
        )

        cfg_dict = cfg.model_dump(mode="json")
        cfg_hash = compute_config_hash(cfg)
        code_rev = get_code_version()
        cache_key = compute_cache_key("cli_dataset", cfg_hash, code_rev)

        run_id = f"r_{uuid.uuid4().hex[:20]}"
        display_name = f"CLI {mode} · {model_type} · {d_min}–{d_max}"

        cur.execute(
            """
            INSERT INTO runs (
                id, owner_id, dataset_id, display_name, mode, model_type,
                config, config_hash, cache_key, status, stage,
                code_version, seed, created_at
            ) VALUES (
                %(id)s, %(owner)s, %(ds)s, %(name)s, %(mode)s, %(model)s,
                %(cfg)s::jsonb, %(hash)s, %(cache)s, 'QUEUED', 'queued',
                %(ver)s, 42, now()
            )
            """,
            {
                "id": run_id,
                "owner": owner_id,
                "ds": dataset_id,
                "name": display_name,
                "mode": mode,
                "model": model_type,
                "cfg": json.dumps(cfg_dict),
                "hash": cfg_hash,
                "cache": cache_key,
                "ver": code_rev,
            },
        )
        conn.commit()

    print(f"Created run {run_id}. Starting execution...")
    execute_run(run_id)

    # Check status
    res = fetch_one("SELECT status, error_message FROM runs WHERE id = %(id)s", {"id": run_id})
    print(f"Run {run_id} finished with status: {res.get('status')}")
    if res.get("error_message"):
        print(f"Error: {res.get('error_message')}")


def main() -> None:
    parser = argparse.ArgumentParser(description="EpiLens compute CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run SIR model fit or forecast evaluation")
    run_parser.add_argument("--dataset", type=str, help="Dataset ID (default: most recent READY dataset)")
    run_parser.add_argument("--mode", type=str, choices=["FIT", "EVALUATE"], default="FIT")
    run_parser.add_argument("--model", type=str, choices=["M1", "M2"], default="M1")
    run_parser.add_argument("--user", type=str, help="User ID owner")
    run_parser.set_defaults(func=cmd_run)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

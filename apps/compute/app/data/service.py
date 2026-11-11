"""Data service layer for EpiLens compute service.

Handles:
- Direct upload processing and raw file persistence
- Column mapping confirmation and normalization
- Bulk observations insertion with database transactions
- Bundled archive and synthetic demo imports
- Remote archive snapshot fetching from allowlist
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import urllib.request
import uuid
from datetime import datetime
from typing import Any

from app.data.bundled import BUNDLED_SOURCES, PUNJAB_CENSUS_2011_POPULATION
from app.data.cleaning import Obs, normalize
from app.data.csv_io import (
    CsvValidationError,
    find_forbidden_pii_columns,
    parse_and_validate_csv,
    suggest_column_mapping,
)
from app.data.safe_csv import safe_filename
from app.db import get_connection

ARCHIVE_ALLOWLIST = ["data.covid19india.org"]
REMOTE_STATE_DAILY_URL = "https://data.covid19india.org/csv/latest/state_wise_daily.csv"


def generate_cuid() -> str:
    """Generate a 25-character cuid-compatible string."""
    return f"c{uuid.uuid4().hex[:24]}"


def create_upload_dataset(user_id: str, filename: str, content: bytes) -> dict[str, Any]:
    """Inspect uploaded CSV, save raw file, create PENDING_MAPPING dataset, and return preview."""
    clean_name = safe_filename(filename)
    sha256 = hashlib.sha256(content).hexdigest()

    # Decode UTF-8 / UTF-8 with BOM
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        raise CsvValidationError(code="invalid_encoding", message="File is not valid UTF-8") from e

    stream = io.StringIO(text)
    reader = csv.reader(stream)
    header = next(reader, None)

    if not header:
        raise CsvValidationError(code="empty_file", message="CSV file is empty")

    headers = [h.strip() for h in header]

    # PII check
    pii_cols = find_forbidden_pii_columns(headers)
    if pii_cols:
        raise CsvValidationError(
            code="identifiers_not_allowed",
            message=f"Uploaded data contains patient identifiers in columns: {', '.join(pii_cols)}. Only aggregate counts are permitted.",
            details={"offending_columns": pii_cols},
        )

    # Read preview rows (up to 10)
    preview_rows: list[list[str]] = []
    for _ in range(10):
        row = next(reader, None)
        if row is None:
            break
        preview_rows.append(row)

    suggested_mapping = suggest_column_mapping(headers)

    raw_file_id = generate_cuid()
    dataset_id = generate_cuid()
    family_id = generate_cuid()
    display_name = clean_name.removesuffix(".csv").replace("_", " ").title()

    with get_connection() as conn:
        with conn.cursor() as cur:
            # 1. Insert stored_file
            cur.execute(
                """
                INSERT INTO stored_files (
                    id, owner_id, dataset_id, kind, filename, mime_type, size_bytes, sha256, content, created_at
                ) VALUES (
                    %(id)s, %(owner_id)s, %(dataset_id)s, 'RAW_UPLOAD', %(filename)s, 'text/csv', %(size_bytes)s, %(sha256)s, %(content)s, now()
                )
                """,
                {
                    "id": raw_file_id,
                    "owner_id": user_id,
                    "dataset_id": dataset_id,
                    "filename": clean_name,
                    "size_bytes": len(content),
                    "sha256": sha256,
                    "content": content,
                },
            )

            # 2. Insert dataset
            cur.execute(
                """
                INSERT INTO datasets (
                    id, owner_id, family_id, version, name, region_code, is_synthetic,
                    source_kind, source_name, sha256, status, raw_file_id,
                    population_value, population_geography, population_reference_year,
                    population_source_url, created_at, updated_at
                ) VALUES (
                    %(id)s, %(owner_id)s, %(family_id)s, 1, %(name)s, 'PB', false,
                    'UPLOAD', %(source_name)s, %(sha256)s, 'PENDING_MAPPING', %(raw_file_id)s,
                    %(pop_val)s, 'Punjab, India', 2011,
                    'https://censusindia.gov.in/', now(), now()
                )
                """,
                {
                    "id": dataset_id,
                    "owner_id": user_id,
                    "family_id": family_id,
                    "name": display_name,
                    "source_name": clean_name,
                    "sha256": sha256,
                    "raw_file_id": raw_file_id,
                    "pop_val": PUNJAB_CENSUS_2011_POPULATION,
                },
            )
        conn.commit()

    return {
        "dataset_id": dataset_id,
        "family_id": family_id,
        "name": display_name,
        "filename": clean_name,
        "headers": headers,
        "preview_rows": preview_rows,
        "suggested_mapping": suggested_mapping,
    }


def confirm_dataset(
    user_id: str,
    dataset_id: str,
    column_mapping: dict[str, str],
    date_range: tuple[str, str] | None = None,
    population: int | None = None,
) -> dict[str, Any]:
    """Parse raw file according to mapping, run normalization, persist observations, and update status."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT d.id, d.owner_id, d.raw_file_id, sf.content
                FROM datasets d
                JOIN stored_files sf ON d.raw_file_id = sf.id
                WHERE d.id = %(dataset_id)s AND d.owner_id = %(owner_id)s
                """,
                {"dataset_id": dataset_id, "owner_id": user_id},
            )
            row = cur.fetchone()

        if not row:
            raise ValueError(f"Dataset {dataset_id} not found or unauthorized")

        raw_content: bytes = bytes(row["content"])

        # Parse CSV
        records, row_errors = parse_and_validate_csv(raw_content, column_mapping)

        # Filter by date range if provided
        if date_range:
            start_d, end_d = date_range
            min_filter = datetime.strptime(start_d, "%Y-%m-%d").date()
            max_filter = datetime.strptime(end_d, "%Y-%m-%d").date()
            records = [r for r in records if min_filter <= r.date <= max_filter]

        # Run normalization
        norm_result = normalize(records, window_days=14)

        summary_dict = {
            "record_count": norm_result.summary.record_count,
            "date_start": norm_result.summary.date_start,
            "date_end": norm_result.summary.date_end,
            "expected_days": norm_result.summary.expected_days,
            "missing_days": norm_result.summary.missing_days,
            "duplicate_keys": norm_result.summary.duplicate_keys,
            "correction_magnitude": norm_result.summary.correction_magnitude,
            "corrections": [
                {
                    "date": c.date,
                    "magnitude": c.magnitude,
                    "row_number": c.row_number,
                    "status": c.status,
                    "adjustments": [
                        {
                            "date": a.date,
                            "before": a.before,
                            "after": a.after,
                            "amount": a.amount,
                        }
                        for a in c.adjustments
                    ],
                }
                for c in norm_result.summary.corrections
            ],
            "unresolved": [
                {
                    "date": u.date,
                    "row_number": u.row_number,
                    "magnitude": u.magnitude,
                    "shortfall": u.shortfall,
                }
                for u in norm_result.summary.unresolved
            ],
            "blocking_issues": [
                {
                    "code": b.code,
                    "message": b.message,
                    "rows": b.rows,
                    "dates": b.dates,
                }
                for b in norm_result.summary.blocking_issues
            ],
            "row_errors": row_errors,
            "analysis_ready": norm_result.summary.analysis_ready and len(row_errors) == 0,
        }

        dataset_status = "READY" if summary_dict["analysis_ready"] else "BLOCKED"

        # Generate clean CSV and quality log
        clean_csv_bytes = generate_clean_csv(norm_result.observations)
        clean_sha256 = hashlib.sha256(clean_csv_bytes).hexdigest()
        clean_file_id = generate_cuid()

        log_json_bytes = json.dumps([
            {"date": l.date, "kind": l.kind, "message": l.message, "details": l.details}
            for l in norm_result.quality_log
        ], indent=2).encode("utf-8")
        log_sha256 = hashlib.sha256(log_json_bytes).hexdigest()
        log_file_id = generate_cuid()

        with conn.cursor() as cur:
            # Save clean CSV file
            cur.execute(
                """
                INSERT INTO stored_files (
                    id, owner_id, dataset_id, kind, filename, mime_type, size_bytes, sha256, content, created_at
                ) VALUES (
                    %(id)s, %(owner_id)s, %(dataset_id)s, 'CLEAN_CSV', 'clean_observations.csv', 'text/csv', %(size_bytes)s, %(sha256)s, %(content)s, now()
                )
                """,
                {
                    "id": clean_file_id,
                    "owner_id": user_id,
                    "dataset_id": dataset_id,
                    "size_bytes": len(clean_csv_bytes),
                    "sha256": clean_sha256,
                    "content": clean_csv_bytes,
                },
            )

            # Save quality log file
            cur.execute(
                """
                INSERT INTO stored_files (
                    id, owner_id, dataset_id, kind, filename, mime_type, size_bytes, sha256, content, created_at
                ) VALUES (
                    %(id)s, %(owner_id)s, %(dataset_id)s, 'QUALITY_LOG', 'quality_log.json', 'application/json', %(size_bytes)s, %(sha256)s, %(content)s, now()
                )
                """,
                {
                    "id": log_file_id,
                    "owner_id": user_id,
                    "dataset_id": dataset_id,
                    "size_bytes": len(log_json_bytes),
                    "sha256": log_sha256,
                    "content": log_json_bytes,
                },
            )

            # Bulk insert observations
            cur.execute("DELETE FROM observations WHERE dataset_id = %(dataset_id)s", {"dataset_id": dataset_id})

            obs_values = [
                (
                    dataset_id,
                    datetime.strptime(obs.date, "%Y-%m-%d").date(),
                    obs.raw,
                    obs.analysis,
                    obs.flag.value,
                    obs.transformation_id,
                    obs.source_ref,
                )
                for obs in norm_result.observations
            ]

            if obs_values:
                cur.executemany(
                    """
                    INSERT INTO observations (
                        dataset_id, date, new_confirmed_raw, new_confirmed_analysis, quality_flag, transformation_id, source_ref
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    obs_values,
                )

            # Update dataset
            pop_clause = ""
            params: dict[str, Any] = {
                "dataset_id": dataset_id,
                "owner_id": user_id,
                "status": dataset_status,
                "clean_file_id": clean_file_id,
                "log_file_id": log_file_id,
                "schema_mapping": json.dumps(column_mapping),
                "quality_summary": json.dumps(summary_dict),
            }
            if population is not None:
                pop_clause = ", population_value = %(pop_val)s"
                params["pop_val"] = population

            cur.execute(
                f"""
                UPDATE datasets
                SET status = %(status)s,
                    clean_file_id = %(clean_file_id)s,
                    quality_log_file_id = %(log_file_id)s,
                    schema_mapping = %(schema_mapping)s,
                    quality_summary = %(quality_summary)s,
                    updated_at = now()
                    {pop_clause}
                WHERE id = %(dataset_id)s AND owner_id = %(owner_id)s
                """,
                params,
            )

        conn.commit()

    return {
        "dataset_id": dataset_id,
        "status": dataset_status,
        "summary": summary_dict,
        "observation_count": len(norm_result.observations),
    }


def import_bundled(user_id: str, source_key: str) -> dict[str, Any]:
    """Import a bundled snapshot or synthetic demo dataset for a user."""
    source = BUNDLED_SOURCES.get(source_key)
    if not source:
        raise ValueError(f"Unknown bundled source: {source_key}")

    csv_path = source["csv_path"]
    if not csv_path.exists():
        raise FileNotFoundError(f"Bundled dataset file {csv_path} does not exist")

    content = csv_path.read_bytes()
    clean_name = csv_path.name
    sha256 = hashlib.sha256(content).hexdigest()

    dataset_id = generate_cuid()
    family_id = generate_cuid()
    raw_file_id = generate_cuid()

    # Parse and normalize
    records, row_errors = parse_and_validate_csv(
        content,
        {"date": "date", "new_confirmed": "confirmed", "region_code": "region_code"},
    )
    norm_result = normalize(records, window_days=14)

    summary_dict = {
        "record_count": norm_result.summary.record_count,
        "date_start": norm_result.summary.date_start,
        "date_end": norm_result.summary.date_end,
        "expected_days": norm_result.summary.expected_days,
        "missing_days": norm_result.summary.missing_days,
        "duplicate_keys": norm_result.summary.duplicate_keys,
        "correction_magnitude": norm_result.summary.correction_magnitude,
        "corrections": [
            {
                "date": c.date,
                "magnitude": c.magnitude,
                "row_number": c.row_number,
                "status": c.status,
                "adjustments": [
                    {"date": a.date, "before": a.before, "after": a.after, "amount": a.amount}
                    for a in c.adjustments
                ],
            }
            for c in norm_result.summary.corrections
        ],
        "unresolved": [
            {"date": u.date, "row_number": u.row_number, "magnitude": u.magnitude, "shortfall": u.shortfall}
            for u in norm_result.summary.unresolved
        ],
        "blocking_issues": [
            {"code": b.code, "message": b.message, "rows": b.rows, "dates": b.dates}
            for b in norm_result.summary.blocking_issues
        ],
        "row_errors": row_errors,
        "analysis_ready": norm_result.summary.analysis_ready and len(row_errors) == 0,
    }

    clean_csv_bytes = generate_clean_csv(norm_result.observations)
    clean_file_id = generate_cuid()

    log_json_bytes = json.dumps([
        {"date": l.date, "kind": l.kind, "message": l.message, "details": l.details}
        for l in norm_result.quality_log
    ], indent=2).encode("utf-8")
    log_file_id = generate_cuid()

    with get_connection() as conn:
        with conn.cursor() as cur:
            # 1. Insert stored raw file
            cur.execute(
                """
                INSERT INTO stored_files (id, owner_id, dataset_id, kind, filename, mime_type, size_bytes, sha256, content, created_at)
                VALUES (%(id)s, %(owner_id)s, %(dataset_id)s, 'RAW_UPLOAD', %(filename)s, 'text/csv', %(size)s, %(sha256)s, %(content)s, now())
                """,
                {
                    "id": raw_file_id,
                    "owner_id": user_id,
                    "dataset_id": dataset_id,
                    "filename": clean_name,
                    "size": len(content),
                    "sha256": sha256,
                    "content": content,
                },
            )

            # 2. Insert clean CSV
            cur.execute(
                """
                INSERT INTO stored_files (id, owner_id, dataset_id, kind, filename, mime_type, size_bytes, sha256, content, created_at)
                VALUES (%(id)s, %(owner_id)s, %(dataset_id)s, 'CLEAN_CSV', 'clean_observations.csv', 'text/csv', %(size)s, %(sha256)s, %(content)s, now())
                """,
                {
                    "id": clean_file_id,
                    "owner_id": user_id,
                    "dataset_id": dataset_id,
                    "size": len(clean_csv_bytes),
                    "sha256": hashlib.sha256(clean_csv_bytes).hexdigest(),
                    "content": clean_csv_bytes,
                },
            )

            # 3. Insert log
            cur.execute(
                """
                INSERT INTO stored_files (id, owner_id, dataset_id, kind, filename, mime_type, size_bytes, sha256, content, created_at)
                VALUES (%(id)s, %(owner_id)s, %(dataset_id)s, 'QUALITY_LOG', 'quality_log.json', 'application/json', %(size)s, %(sha256)s, %(content)s, now())
                """,
                {
                    "id": log_file_id,
                    "owner_id": user_id,
                    "dataset_id": dataset_id,
                    "size": len(log_json_bytes),
                    "sha256": hashlib.sha256(log_json_bytes).hexdigest(),
                    "content": log_json_bytes,
                },
            )

            # 4. Insert dataset
            cur.execute(
                """
                INSERT INTO datasets (
                    id, owner_id, family_id, version, name, region_code, is_synthetic,
                    source_kind, source_name, source_url, retrieved_at, sha256, status,
                    raw_file_id, clean_file_id, quality_log_file_id, schema_mapping, quality_summary,
                    population_value, population_geography, population_reference_year, population_source_url,
                    created_at, updated_at
                ) VALUES (
                    %(id)s, %(owner_id)s, %(family_id)s, 1, %(name)s, 'PB', %(is_synthetic)s,
                    %(source_kind)s, %(source_name)s, %(source_url)s, now(), %(sha256)s, 'READY',
                    %(raw_file_id)s, %(clean_file_id)s, %(log_file_id)s, %(schema_mapping)s, %(quality_summary)s,
                    %(pop_val)s, 'Punjab, India', 2011, %(pop_url)s,
                    now(), now()
                )
                """,
                {
                    "id": dataset_id,
                    "owner_id": user_id,
                    "family_id": family_id,
                    "name": source["name"],
                    "is_synthetic": source["is_synthetic"],
                    "source_kind": "SYNTHETIC" if source["is_synthetic"] else "ARCHIVE",
                    "source_name": source_key,
                    "source_url": "https://data.covid19india.org" if not source["is_synthetic"] else None,
                    "sha256": sha256,
                    "raw_file_id": raw_file_id,
                    "clean_file_id": clean_file_id,
                    "log_file_id": log_file_id,
                    "schema_mapping": json.dumps({"date": "date", "new_confirmed": "confirmed", "region_code": "region_code"}),
                    "quality_summary": json.dumps(summary_dict),
                    "pop_val": source["population"],
                    "pop_url": "https://censusindia.gov.in/",
                },
            )

            # 5. Insert observations
            obs_values = [
                (
                    dataset_id,
                    datetime.strptime(obs.date, "%Y-%m-%d").date(),
                    obs.raw,
                    obs.analysis,
                    obs.flag.value,
                    obs.transformation_id,
                    obs.source_ref,
                )
                for obs in norm_result.observations
            ]
            if obs_values:
                cur.executemany(
                    """
                    INSERT INTO observations (
                        dataset_id, date, new_confirmed_raw, new_confirmed_analysis, quality_flag, transformation_id, source_ref
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    obs_values,
                )

        conn.commit()

    return {
        "dataset_id": dataset_id,
        "name": source["name"],
        "status": "READY",
        "is_synthetic": source["is_synthetic"],
        "observation_count": len(norm_result.observations),
        "date_start": norm_result.summary.date_start,
        "date_end": norm_result.summary.date_end,
    }


def fetch_archive_snapshot(user_id: str, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
    """Fetch live snapshot from allowlisted data.covid19india.org and save as dataset."""
    req = urllib.request.Request(
        REMOTE_STATE_DAILY_URL,
        headers={"User-Agent": "EpiLens-Archive-Client/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()

    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    rows_pb: list[dict[str, str]] = []
    for row in reader:
        if row.get("Status", "").strip().lower() == "confirmed":
            d_ymd = row.get("Date_YMD", "").strip()
            if not d_ymd and "Date" in row:
                try:
                    dt = datetime.strptime(row["Date"].strip(), "%d-%b-%y")
                    d_ymd = dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue
            pb_cases = row.get("PB", "").strip()
            if d_ymd:
                rows_pb.append({"date": d_ymd, "confirmed": pb_cases if pb_cases else "0", "region_code": "PB"})

    rows_pb.sort(key=lambda r: r["date"])

    # Create CSV buffer
    out_buf = io.StringIO()
    writer = csv.DictWriter(out_buf, fieldnames=["date", "confirmed", "region_code"])
    writer.writeheader()
    writer.writerows(rows_pb)
    filtered_csv_bytes = out_buf.getvalue().encode("utf-8")

    # Upload as a dataset
    res = create_upload_dataset(user_id, "punjab_covid19india_snapshot.csv", filtered_csv_bytes)
    confirmed_res = confirm_dataset(
        user_id,
        res["dataset_id"],
        {"date": "date", "new_confirmed": "confirmed", "region_code": "region_code"},
        date_range=(start_date, end_date) if start_date and end_date else None,
    )
    return confirmed_res


def generate_clean_csv(observations: list[Obs]) -> bytes:
    """Generate canonical clean CSV with neutral spreadsheet formulas."""
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["date", "new_confirmed_raw", "new_confirmed_analysis", "quality_flag", "source_ref"])
    for obs in observations:
        writer.writerow([
            obs.date,
            obs.raw if obs.raw is not None else "",
            obs.analysis if obs.analysis is not None else "",
            obs.flag.value,
            obs.source_ref or "",
        ])
    return stream.getvalue().encode("utf-8")

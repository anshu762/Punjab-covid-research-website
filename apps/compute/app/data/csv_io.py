"""CSV parsing, PII identifier validation, and schema checking for EpiLens."""

from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime
from typing import Any

from app.data.cleaning import RawRecord

# PRD Rule: Reject patient identifiers. Aggregate counts only.
FORBIDDEN_IDENTIFIER_PATTERNS = [
    r"\bname\b",
    r"\bpatient\b",
    r"\baadhar\b",
    r"\badhaar\b",
    r"\bphone\b",
    r"\bmobile\b",
    r"\bemail\b",
    r"\baddress\b",
    r"\bhospital\b",
    r"\bdoctor\b",
    r"\bdob\b",
    r"\bage\b",
    r"\bsex\b",
    r"\bgender\b",
    r"\bpassport\b",
    r"\bssn\b",
    r"\bcontact\b",
]

MAX_CSV_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_CSV_ROWS = 100_000


class CsvValidationError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def find_forbidden_pii_columns(headers: list[str]) -> list[str]:
    """Return any header names that appear to contain individual patient/identifying information."""
    offending: list[str] = []
    for h in headers:
        normalized = h.strip().lower()
        for pat in FORBIDDEN_IDENTIFIER_PATTERNS:
            if re.search(pat, normalized):
                offending.append(h)
                break
    return offending


def suggest_column_mapping(headers: list[str]) -> dict[str, str | None]:
    """Suggest canonical mapping ('date', 'new_confirmed', 'region_code') based on header names."""
    mapping: dict[str, str | None] = {
        "date": None,
        "new_confirmed": None,
        "region_code": None,
    }

    date_patterns = [r"date", r"\bday\b"]
    count_patterns = [
        r"confirmed",
        r"\bcases\b",
        r"\bpositive\b",
        r"\bcount\b",
    ]
    region_patterns = [r"region", r"state"]

    for h in headers:
        norm = h.strip().lower()
        if mapping["date"] is None and any(re.search(p, norm) for p in date_patterns):
            mapping["date"] = h
            continue

        if mapping["new_confirmed"] is None and any(re.search(p, norm) for p in count_patterns):
            mapping["new_confirmed"] = h
            continue

        if mapping["region_code"] is None and any(re.search(p, norm) for p in region_patterns):
            mapping["region_code"] = h
            continue

    return mapping


def parse_date_flexible(val_str: str) -> date | None:
    """Parse various date formats into a datetime.date object.

    Supports: YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YYYY, DD-Mon-YY, DD-Mon-YYYY.
    """
    clean = val_str.strip()
    if not clean:
        return None

    # Try common formats
    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%d-%b-%y",   # e.g. 01-Jul-20
        "%d-%b-%Y",   # e.g. 01-Jul-2020
        "%d %b %Y",
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(clean, fmt).date()
        except ValueError:
            pass

    return None


def parse_and_validate_csv(
    raw_content: bytes | str,
    column_mapping: dict[str, str],
    max_bytes: int = MAX_CSV_BYTES,
    max_rows: int = MAX_CSV_ROWS,
) -> tuple[list[RawRecord], list[dict[str, Any]]]:
    """Parse raw CSV content, validate rows against column mapping, and return (records, errors).

    Row numbers are 1-based where row 1 is the header and row 2 is the first data row.
    Errors collect up to 100 row numbers per code plus the total count.
    """
    # 1. Size check
    if isinstance(raw_content, bytes):
        if len(raw_content) > max_bytes:
            raise CsvValidationError(
                code="file_too_large",
                message=f"File exceeds maximum allowed size of {max_bytes // (1024 * 1024)} MB",
            )
        # Decode UTF-8 / UTF-8 with BOM
        try:
            text = raw_content.decode("utf-8-sig")
        except UnicodeDecodeError as e:
            raise CsvValidationError(
                code="invalid_encoding",
                message="File encoding is not valid UTF-8",
                details={"error": str(e)},
            ) from e
    else:
        text = raw_content

    # 2. Check header
    stream = io.StringIO(text)
    reader = csv.reader(stream)

    try:
        header = next(reader, None)
    except Exception as e:
        raise CsvValidationError(
            code="malformed_csv",
            message="Could not read CSV header",
            details={"error": str(e)},
        ) from e

    if not header:
        raise CsvValidationError(code="empty_file", message="CSV file is empty")

    header_clean = [h.strip() for h in header]

    # Check for PII headers
    pii_cols = find_forbidden_pii_columns(header_clean)
    if pii_cols:
        raise CsvValidationError(
            code="identifiers_not_allowed",
            message=f"Uploaded data contains patient identifiers in columns: {', '.join(pii_cols)}. Only aggregate counts are permitted.",
            details={"offending_columns": pii_cols},
        )

    # Check mapped columns exist in header
    date_col = column_mapping.get("date")
    count_col = column_mapping.get("new_confirmed")
    region_col = column_mapping.get("region_code")

    if not date_col or date_col not in header_clean:
        raise CsvValidationError(
            code="missing_date_column",
            message=f"Date column '{date_col}' not found in CSV header",
        )
    if not count_col or count_col not in header_clean:
        raise CsvValidationError(
            code="missing_count_column",
            message=f"Count column '{count_col}' not found in CSV header",
        )

    date_idx = header_clean.index(date_col)
    count_idx = header_clean.index(count_col)
    region_idx = header_clean.index(region_col) if region_col and region_col in header_clean else None

    # Error buckets
    error_collector: dict[str, dict[str, Any]] = {
        "invalid_date": {"message": "Invalid or unparseable date", "rows": [], "total": 0},
        "invalid_count": {"message": "Non-integer count value", "rows": [], "total": 0},
        "wrong_region": {"message": "Region is not PB (Punjab)", "rows": [], "total": 0},
        "row_length_mismatch": {"message": "Row has fewer columns than header", "rows": [], "total": 0},
    }

    records: list[RawRecord] = []
    row_count = 1  # 1 is header

    for row in reader:
        row_count += 1
        if row_count - 1 > max_rows:
            raise CsvValidationError(
                code="row_limit_exceeded",
                message=f"CSV file exceeds maximum limit of {max_rows} rows",
            )

        if not row or all(c.strip() == "" for c in row):
            # Skip empty lines
            continue

        max_needed_idx = max(date_idx, count_idx, region_idx if region_idx is not None else 0)
        if len(row) <= max_needed_idx:
            err = error_collector["row_length_mismatch"]
            err["total"] += 1
            if len(err["rows"]) < 100:
                err["rows"].append(row_count)
            continue

        # 1. Parse date
        date_raw = row[date_idx].strip()
        parsed_d = parse_date_flexible(date_raw)
        if not parsed_d:
            err = error_collector["invalid_date"]
            err["total"] += 1
            if len(err["rows"]) < 100:
                err["rows"].append(row_count)
            continue

        # 2. Check region if mapped
        if region_idx is not None:
            region_val = row[region_idx].strip()
            # Non-blank values must equal PB (case-insensitive)
            if region_val and region_val.upper() != "PB":
                err = error_collector["wrong_region"]
                err["total"] += 1
                if len(err["rows"]) < 100:
                    err["rows"].append(row_count)
                continue

        # 3. Parse count
        count_raw = row[count_idx].strip()
        parsed_count: int | None = None
        if count_raw != "":
            # Must parse cleanly as an integer (can be negative for corrections)
            try:
                parsed_count = int(count_raw)
            except ValueError:
                # If it's a float like "12.0", is that allowed or non-integer?
                # "non-integer count (e.g. '12.5', 'abc') -> error with row numbers"
                try:
                    f_val = float(count_raw)
                    if f_val.is_integer():
                        parsed_count = int(f_val)
                    else:
                        raise ValueError("Non-integer count")
                except ValueError:
                    err = error_collector["invalid_count"]
                    err["total"] += 1
                    if len(err["rows"]) < 100:
                        err["rows"].append(row_count)
                    continue

        records.append(RawRecord(date=parsed_d, value=parsed_count, row_number=row_count))

    # Format errors
    errors: list[dict[str, Any]] = []
    for code, info in error_collector.items():
        if info["total"] > 0:
            errors.append({
                "code": code,
                "message": info["message"],
                "rows": info["rows"],
                "total_occurrences": info["total"],
            })

    return records, errors

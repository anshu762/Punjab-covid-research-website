"""Fetch and freeze Punjab COVID-19 daily confirmed cases snapshot from data.covid19india.org."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

SOURCE_URL = "https://data.covid19india.org/csv/latest/state_wise_daily.csv"
OUT_DIR = Path(__file__).resolve().parent.parent / "data"


def fetch_and_save() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_out_path = OUT_DIR / "punjab_covid_pb_frozen.csv"
    meta_out_path = OUT_DIR / "punjab_covid_pb_frozen.provenance.json"

    print(f"Fetching from {SOURCE_URL}...")
    req = urllib.request.Request(
        SOURCE_URL,
        headers={"User-Agent": "EpiLens-Snapshot-Fetcher/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw_bytes = resp.read()

    sha256_full = hashlib.sha256(raw_bytes).hexdigest()
    text = raw_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    rows_pb: list[dict[str, str]] = []
    # Filter for Status == 'Confirmed'
    for row in reader:
        status = row.get("Status", "").strip()
        if status.lower() == "confirmed":
            date_ymd = row.get("Date_YMD", "").strip()
            # If Date_YMD is empty, try Date
            if not date_ymd and "Date" in row:
                try:
                    dt = datetime.strptime(row["Date"].strip(), "%d-%b-%y")
                    date_ymd = dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue
            pb_count = row.get("PB", "").strip()
            if date_ymd:
                rows_pb.append({
                    "date": date_ymd,
                    "confirmed": pb_count if pb_count else "0",
                    "region_code": "PB",
                })

    # Sort chronologically by date
    rows_pb.sort(key=lambda r: r["date"])

    # Write frozen CSV
    with open(csv_out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "confirmed", "region_code"])
        writer.writeheader()
        writer.writerows(rows_pb)

    csv_sha256 = hashlib.sha256(csv_out_path.read_bytes()).hexdigest()

    min_date = rows_pb[0]["date"] if rows_pb else None
    max_date = rows_pb[-1]["date"] if rows_pb else None

    provenance = {
        "dataset_key": "punjab_frozen_archive",
        "name": "Punjab COVID-19 Archive (covid19india)",
        "source_url": SOURCE_URL,
        "retrieved_at": datetime.now(UTC).isoformat(),
        "full_source_sha256": sha256_full,
        "filtered_csv_sha256": csv_sha256,
        "region_code": "PB",
        "region_name": "Punjab, India",
        "date_start": min_date,
        "date_end": max_date,
        "record_count": len(rows_pb),
        "is_synthetic": False,
        "population": 27743338,
        "population_provenance": "Census 2011 official state total for Punjab, India",
    }

    with open(meta_out_path, "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2)

    print(f"Successfully saved {len(rows_pb)} records to {csv_out_path}")
    print(f"Provenance saved to {meta_out_path}")


if __name__ == "__main__":
    fetch_and_save()

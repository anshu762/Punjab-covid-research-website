"""Generate deterministic synthetic Punjab-like demo dataset with seed=42."""

from __future__ import annotations

import csv
import hashlib
import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import numpy as np

OUT_DIR = Path(__file__).resolve().parent.parent / "data"


def generate_synthetic_demo() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_out_path = OUT_DIR / "synthetic_demo.csv"
    meta_out_path = OUT_DIR / "synthetic_demo.provenance.json"

    # Deterministic seed
    rng = np.random.default_rng(seed=42)

    start_date = date(2020, 7, 1)
    end_date = date(2020, 11, 30)
    total_days = (end_date - start_date).days + 1  # 153 days

    # Bell-shaped wave peaking around mid-September (day ~75)
    t = np.arange(total_days)
    peak_day = 78
    sigma = 24
    peak_height = 2800
    baseline = 120

    # Gaussian epidemic wave
    wave = baseline + (peak_height - baseline) * np.exp(-((t - peak_day) ** 2) / (2 * (sigma ** 2)))

    # Weekly reporting cycle modulation (lower on Sundays/Mondays)
    weekday_factors = [0.92, 0.98, 1.05, 1.04, 1.02, 1.06, 0.85]  # Mon=0 .. Sun=6

    rows: list[dict[str, str]] = []
    for day_idx in range(total_days):
        current_date = start_date + timedelta(days=day_idx)
        w_factor = weekday_factors[current_date.weekday()]
        mean_cases = wave[day_idx] * w_factor

        # Add Poisson / Negative Binomial style variation
        noise = rng.normal(0, np.sqrt(mean_cases) * 1.5)
        cases = max(10, round(mean_cases + noise))

        rows.append({
            "date": current_date.isoformat(),
            "confirmed": str(cases),
            "region_code": "PB",
        })

    with open(csv_out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "confirmed", "region_code"])
        writer.writeheader()
        writer.writerows(rows)

    csv_sha256 = hashlib.sha256(csv_out_path.read_bytes()).hexdigest()

    provenance = {
        "dataset_key": "synthetic_demo",
        "name": "Synthetic Demo (Punjab-like)",
        "source_url": "synthetic://generator?seed=42",
        "retrieved_at": datetime.now(UTC).isoformat(),
        "filtered_csv_sha256": csv_sha256,
        "region_code": "PB",
        "region_name": "Punjab, India",
        "date_start": start_date.isoformat(),
        "date_end": end_date.isoformat(),
        "record_count": total_days,
        "is_synthetic": True,
        "population": 27743338,
        "population_provenance": "Synthetic Punjab-like epidemic curve (Seed 42) based on Census 2011 population baseline",
    }

    with open(meta_out_path, "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2)

    print(f"Generated {total_days} synthetic observations to {csv_out_path}")
    print(f"Provenance saved to {meta_out_path}")


if __name__ == "__main__":
    generate_synthetic_demo()

"""Bundled dataset registry and provenance loader for EpiLens."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

def find_data_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "data",
        Path(__file__).resolve().parent.parent / "data",
        Path.cwd() / "data",
        Path.cwd() / "apps" / "compute" / "data",
        Path("/app/data"),
    ]
    for c in candidates:
        if (c / "punjab_covid_pb_frozen.csv").exists():
            return c
    return candidates[0]


DATA_DIR = find_data_dir()

PUNJAB_CENSUS_2011_POPULATION = 27_743_338
PUNJAB_POPULATION_PROVENANCE = "Official Census of India 2011 state total for Punjab"


def load_bundled_provenance(key: str) -> dict[str, Any]:
    meta_file = DATA_DIR / f"{key}.provenance.json"
    if meta_file.exists():
        with open(meta_file, encoding="utf-8") as f:
            return json.load(f)
    return {}


BUNDLED_SOURCES: dict[str, dict[str, Any]] = {
    "punjab_frozen_archive": {
        "key": "punjab_frozen_archive",
        "name": "Punjab COVID-19 Archive (covid19india)",
        "source_kind": "BUNDLED_SNAPSHOT",
        "csv_path": DATA_DIR / "punjab_covid_pb_frozen.csv",
        "provenance_path": DATA_DIR / "punjab_covid_pb_frozen.provenance.json",
        "is_synthetic": False,
        "region_code": "PB",
        "region_name": "Punjab, India",
        "population": PUNJAB_CENSUS_2011_POPULATION,
        "population_provenance": PUNJAB_POPULATION_PROVENANCE,
    },
    "synthetic_demo": {
        "key": "synthetic_demo",
        "name": "Synthetic demo (Punjab-like)",
        "source_kind": "SYNTHETIC",
        "csv_path": DATA_DIR / "synthetic_demo.csv",
        "provenance_path": DATA_DIR / "synthetic_demo.provenance.json",
        "is_synthetic": True,
        "region_code": "PB",
        "region_name": "Punjab, India",
        "population": PUNJAB_CENSUS_2011_POPULATION,
        "population_provenance": "Synthetic epidemic wave generated with seed=42 using Census 2011 baseline",
    },
}


def get_bundled_source(key: str) -> dict[str, Any] | None:
    source = BUNDLED_SOURCES.get(key)
    if not source:
        return None
    provenance = load_bundled_provenance(key)
    return {**source, "provenance": provenance}

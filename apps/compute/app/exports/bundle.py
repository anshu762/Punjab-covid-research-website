"""Reproducibility bundle generator (ZIP + SHA-256 Manifest)."""
from __future__ import annotations

import hashlib
import io
import json
import os
import platform
import sys
import zipfile
from datetime import UTC, datetime
from typing import Any

import matplotlib
import numpy
import pandas
import scipy

from app.exports.csv_builders import (
    build_cleaned_dataset_csv,
    build_correction_log_csv,
    build_fitted_states_csv,
    build_forecasts_csv,
    build_metrics_csv,
)
from app.exports.figures import render_observed_and_fitted_figure


def sha256_bytes(b: bytes) -> str:
    """Compute hex SHA-256 digest of byte array."""
    return hashlib.sha256(b).hexdigest()


def audit_manifest_security(manifest_dict: dict[str, Any]) -> None:
    """Security audit: ensure manifest strictly excludes secrets and local file paths."""
    manifest_str = json.dumps(manifest_dict)

    # Disallowed keywords
    prohibited_keywords = [
        "postgresql://",
        "postgres:",
        "password",
        "AUTH_SECRET",
        "DATABASE_URL",
        "COMPUTE_SHARED_SECRET",
    ]
    for kw in prohibited_keywords:
        if kw.lower() in manifest_str.lower():
            raise ValueError(f"Security audit failure: Manifest contains sensitive keyword: {kw}")

    # Check for raw absolute local filesystem paths (e.g. C:\Users\ or /home/)
    lower_manifest = manifest_str.lower()
    if (
        "c:\\users" in lower_manifest
        or "c:\\\\users" in lower_manifest
        or "/home/" in lower_manifest
        or "/users/" in lower_manifest
    ):
        raise ValueError("Security audit failure: Manifest leaks host server file path.")


def build_reproducibility_bundle(
    run_row: dict[str, Any],
    payload: dict[str, Any],
    dataset_row: dict[str, Any],
) -> tuple[bytes, dict[str, Any], str]:
    """Generate in-memory reproducibility ZIP archive and signed manifest."""
    run_id = str(run_row["id"])
    code_version = str(run_row.get("code_version") or "1.0.0")
    exported_at = datetime.now(UTC).isoformat()

    file_entries: list[tuple[str, bytes]] = []

    # 1. Config JSON
    raw_config = run_row.get("config") or {}
    config_dict = json.loads(raw_config) if isinstance(raw_config, str) else raw_config
    config_bytes = json.dumps(config_dict, indent=2).encode("utf-8")
    file_entries.append(("config.json", config_bytes))

    # 2. Provenance JSON
    provenance_data = {
        "datasetId": dataset_row.get("id"),
        "datasetName": dataset_row.get("name"),
        "version": dataset_row.get("version", 1),
        "sourceChecksum": dataset_row.get("sha256"),
        "isSynthetic": dataset_row.get("is_synthetic", False),
        "population": payload.get("assumptions", {}).get("population", {}),
        "exportedAt": exported_at,
    }
    prov_bytes = json.dumps(provenance_data, indent=2).encode("utf-8")
    file_entries.append(("provenance.json", prov_bytes))

    # 3. CSVs
    dataset_id = str(dataset_row.get("id"))
    cleaned_csv = build_cleaned_dataset_csv(dataset_id).encode("utf-8")
    file_entries.append(("cleaned_dataset.csv", cleaned_csv))

    correction_csv = build_correction_log_csv(dataset_id).encode("utf-8")
    file_entries.append(("correction_log.csv", correction_csv))

    fitted_csv = build_fitted_states_csv(payload).encode("utf-8")
    file_entries.append(("fitted_states.csv", fitted_csv))

    forecasts_csv = build_forecasts_csv(run_id).encode("utf-8")
    file_entries.append(("forecasts.csv", forecasts_csv))

    metrics_csv = build_metrics_csv(payload).encode("utf-8")
    file_entries.append(("metrics.csv", metrics_csv))

    # 4. Figures (300 DPI PNG and SVG)
    fig_png = render_observed_and_fitted_figure(payload, format="png")
    file_entries.append(("figure_observed_and_fitted.png", fig_png))

    fig_svg = render_observed_and_fitted_figure(payload, format="svg")
    file_entries.append(("figure_observed_and_fitted.svg", fig_svg))

    # 5. README.txt
    readme_text = f"""EpiLens Reproducibility Bundle
================================
Run ID: {run_id}
Exported: {exported_at}
Code Revision: {code_version}

This package contains complete data, model trajectories, evaluated forecasts,
publication figures, and configurations to reproduce the research analysis.

Contents:
- manifest.json: Cryptographic SHA-256 hashes for all included files.
- config.json: Model specifications, initial assumptions, and hyperparameters.
- provenance.json: Population provenance, source data archive information, and data integrity hashes.
- cleaned_dataset.csv: Normalized daily epidemiological observations.
- correction_log.csv: Anomaly detection and non-monotonicity adjustments log.
- fitted_states.csv: Numerical integration trajectories for latent states (S, I, R, C) and beta(t).
- forecasts.csv: Rolling 7-day held-out forecast evaluations across 13 origins.
- metrics.csv: Development and final split MAE, RMSE, and model selection rule evaluations.
- figure_observed_and_fitted.png: Publication-ready 300 DPI chart with assumption annotations.
- figure_observed_and_fitted.svg: Scalable vector graphic alternative.

Reproduction Instructions:
1. Python version >= 3.12 is recommended.
2. Install dependencies:
   pip install numpy=={numpy.__version__} scipy=={scipy.__version__} pandas=={pandas.__version__} matplotlib=={matplotlib.__version__}
3. Run numerical integration using the parameters specified in config.json.
"""
    readme_bytes = readme_text.encode("utf-8")
    file_entries.append(("README.txt", readme_bytes))

    # 6. Manifest calculation
    manifest_files = [
        {
            "filename": fname,
            "sha256": sha256_bytes(fbytes),
            "sizeBytes": len(fbytes),
        }
        for fname, fbytes in file_entries
    ]

    manifest = {
        "schemaVersion": 1,
        "runId": run_id,
        "exportedAt": exported_at,
        "codeVersion": code_version,
        "environment": {
            "pythonVersion": platform.python_version(),
            "os": f"{platform.system()} {platform.release()}",
            "packages": {
                "numpy": numpy.__version__,
                "scipy": scipy.__version__,
                "pandas": pandas.__version__,
                "matplotlib": matplotlib.__version__,
            },
        },
        "dataset": {
            "id": dataset_id,
            "name": dataset_row.get("name", "Dataset"),
            "version": int(dataset_row.get("version", 1)),
            "sha256": str(dataset_row.get("sha256", "")),
        },
        "files": manifest_files,
    }

    # Audit security before packing
    audit_manifest_security(manifest)

    manifest_bytes = json.dumps(manifest, indent=2).encode("utf-8")
    file_entries.append(("manifest.json", manifest_bytes))

    # 7. Pack into ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for fname, fbytes in file_entries:
            zf.writestr(fname, fbytes)

    bundle_bytes = zip_buffer.getvalue()
    bundle_checksum = sha256_bytes(bundle_bytes)

    return bundle_bytes, manifest, bundle_checksum

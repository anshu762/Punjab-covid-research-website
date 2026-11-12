"""Tests for export generation, manifest security audit, formula neutralization, and figure DPI."""
import hashlib
import io
import json
import zipfile
import pytest

from app.exports.csv_builders import neutralize
from app.exports.bundle import audit_manifest_security, sha256_bytes
from app.exports.figures import render_observed_and_fitted_figure


def test_formula_neutralization():
    """Text cells with spreadsheet formula triggers must be prepended with a single quote."""
    assert neutralize("=1+1") == "'=1+1"
    assert neutralize("+SUM(A1:A10)") == "'+SUM(A1:A10)"
    assert neutralize("-2+3") == "'-2+3"
    assert neutralize("@IMPORTDATA") == "'@IMPORTDATA"
    assert neutralize("\tmalicious_tab") == "'\tmalicious_tab"

    # Non-formula strings and numbers should remain unchanged
    assert neutralize("Normal Text") == "Normal Text"
    assert neutralize("2020-11-30") == "2020-11-30"
    assert neutralize(12345) == 12345
    assert neutralize(0.25) == 0.25


def test_manifest_security_audit():
    """Security audit must reject manifests containing passwords, db connection strings, or server paths."""
    clean_manifest = {
        "runId": "run_123",
        "codeVersion": "1.0.0",
        "dataset": {"id": "ds_1", "sha256": "abc"},
        "files": [{"filename": "test.csv", "sha256": "def", "sizeBytes": 100}],
    }
    # Clean manifest must pass without raising
    audit_manifest_security(clean_manifest)

    # Leaking connection string or password
    with pytest.raises(ValueError, match="sensitive keyword"):
        audit_manifest_security({"runId": "run_1", "db": "postgresql://postgres:secret@db:5432/epilens"})

    with pytest.raises(ValueError, match="sensitive keyword"):
        audit_manifest_security({"runId": "run_1", "env": {"AUTH_SECRET": "secret_token_123"}})

    # Leaking local user path
    with pytest.raises(ValueError, match="host server file path"):
        audit_manifest_security({"runId": "run_1", "path": "C:\\Users\\Administrator\\Desktop\\epiLens"})


def test_figure_dpi_and_dimensions():
    """Rendered PNG figure must be high-resolution (300 DPI scale)."""
    payload = {
        "run": {"modelType": "M1"},
        "series": [
            {
                "date": f"2020-07-{d:02d}",
                "observed": 100 + d * 5,
                "expected": 95 + d * 5.2,
                "lower": 80 + d * 5,
                "upper": 120 + d * 5,
                "S": 27000000,
                "I": 50000,
                "R": 2950000,
                "C": 3000000,
                "beta": 0.25,
                "rEff": 1.2,
            }
            for d in range(1, 15)
        ],
        "assumptions": {
            "gamma": 0.142857,
            "reportingFraction": 0.20,
        },
    }

    png_bytes = render_observed_and_fitted_figure(payload, format="png")
    assert len(png_bytes) > 10000

    # Verify PNG header
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"

    # SVG alternative
    svg_bytes = render_observed_and_fitted_figure(payload, format="svg")
    assert b"<svg" in svg_bytes

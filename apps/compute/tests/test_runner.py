"""Unit and integration tests for run execution lifecycle, cancellation, and failure handling."""
import json
from unittest.mock import MagicMock, patch

import pytest

from app.models.fit import OptimizationFailed
from app.runner import (
    RunPipelineCancelled,
    _map_error_message,
    check_cancellation,
    execute_run,
)


def test_map_error_message_optimization_failed():
    exc = OptimizationFailed("Math failed")
    ref, msg = _map_error_message(exc)
    assert ref.startswith("ERR-")
    assert len(ref) == 12  # ERR- + 8 hex
    assert "Try widening the β bounds" in msg
    assert "Math failed" not in msg  # sanitized actionable message


def test_map_error_message_population_missing():
    exc = ValueError("population_provenance_missing")
    ref, msg = _map_error_message(exc)
    assert ref.startswith("ERR-")
    assert "Empirical fitting is blocked until population provenance is provided" in msg


def test_map_error_message_unexpected():
    exc = RuntimeError("Secret database password failed at /home/user/code/db.py line 42")
    ref, msg = _map_error_message(exc)
    assert ref.startswith("ERR-")
    assert "Unexpected computational error" in msg
    # Verify no file paths or sensitive trace exposed in stored user message
    assert "password" not in msg
    assert "/home/user" not in msg


def test_check_cancellation_triggers():
    with patch("app.runner.fetch_one", return_value={"cancel_requested": True}), pytest.raises(RunPipelineCancelled):
        check_cancellation("run_123")

    with patch("app.runner.fetch_one", return_value={"cancel_requested": False}):
        # Should not raise
        check_cancellation("run_123")


def test_execute_run_fit_mode_stubbed_db():
    """Verify complete FIT lifecycle with stubbed DB layer."""
    dummy_config = {

        "datasetId": "ds_test",
        "dateRange": {"start": "2020-07-01", "end": "2020-07-30"},
        "population": {
            "value": 10000000,
            "sourceUrl": "https://censusindia.gov.in/punjab",
            "referenceYear": 2020,
            "geography": "Punjab, India",
        },
        "mode": "FIT",
        "modelType": "M1",
        "infectiousDurationDays": 7,
        "reportingFraction": 0.20,
        "susceptibleFraction": 0.95,
        "uncertainty": "OFF",
        "advanced": {"nStarts": 3},
    }

    dummy_run = {
        "id": "run_test_1",
        "dataset_id": "ds_test",
        "config": dummy_config,
    }

    dummy_dataset = {
        "id": "ds_test",
        "status": "READY",
        "population_value": 10000000,
        "population_source_url": "https://censusindia.gov.in/punjab",
        "population_reference_year": 2020,
        "population_geography": "Punjab, India",
    }

    # Generate 30 days of observations
    obs_rows = []
    for i in range(1, 31):
        d_str = f"2020-07-{i:02d}"
        obs_rows.append({
            "date": d_str,
            "new_confirmed_raw": 100 + i * 5,
            "new_confirmed_analysis": 100 + i * 5,
            "quality_flag": "OK",
        })

    executed_sql: list[tuple[str, dict]] = []

    def mock_fetch_one(query, params=None):
        if "FROM runs" in query and "cancel_requested" in query:
            return {"cancel_requested": False}
        if "FROM runs" in query:
            return dummy_run
        if "FROM datasets" in query:
            return dummy_dataset
        return None

    def mock_fetch_all(query, params=None):
        if "FROM observations" in query:
            return obs_rows
        return []

    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur

    inserted_fit_results = []
    def mock_cur_execute(sql, params=None):
        executed_sql.append((sql, params or {}))
        if "INSERT INTO fit_results" in sql:
            inserted_fit_results.append(params)

    mock_cur.execute.side_effect = mock_cur_execute

    with (
        patch("app.runner.fetch_one", side_effect=mock_fetch_one),
        patch("app.runner.fetch_all", side_effect=mock_fetch_all),
        patch("app.runner.execute"),
        patch("app.runner.get_connection", return_value=MagicMock(__enter__=MagicMock(return_value=mock_conn))),

    ):
        execute_run("run_test_1", job_id="job_test_1")

    assert len(inserted_fit_results) == 1
    fit_payload_str = inserted_fit_results[0]["payload"]
    fit_payload = json.loads(fit_payload_str)

    assert fit_payload["schemaVersion"] == 1
    assert fit_payload["run"]["id"] == "run_test_1"
    assert fit_payload["run"]["mode"] == "FIT"
    assert fit_payload["run"]["modelType"] == "M1"
    assert len(fit_payload["series"]) == 30
    assert fit_payload["finalState"]["S"] > 0
    assert "residuals" in fit_payload["diagnostics"]



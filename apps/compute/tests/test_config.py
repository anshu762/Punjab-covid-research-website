"""Tests for Pydantic v2 RunConfig and hashing."""
import pytest

from app.config import (
    RunConfig,
    compute_cache_key,
    compute_config_hash,
)


def get_valid_config_dict():
    return {
        "datasetId": "ds_123",
        "dateRange": {
            "start": "2020-07-01",
            "end": "2020-11-30",
        },
        "population": {
            "value": 30000000,
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
        "advanced": {
            "betaBounds": [0.01, 2.0],
            "initialInfectiousBounds": [1.0, 100000.0],
            "dispersionBounds": [0.05, 1000.0],
            "nStarts": 20,
            "seed": 42,
            "rtol": 1e-8,
            "atol": 1e-8,
            "cpMinSegmentDays": 21,
            "cpStepDays": 7,
            "cpSearchStarts": 5,
            "bootstrapStarts": 1,
            "bootstrapReplicates": 200,
        },
    }


def test_valid_config_parses():
    d = get_valid_config_dict()
    config = RunConfig(**d)
    assert config.datasetId == "ds_123"
    assert config.mode == "FIT"


def test_invalid_infectious_duration():
    d = get_valid_config_dict()
    d["infectiousDurationDays"] = 2
    with pytest.raises(ValueError):
        RunConfig(**d)

    d["infectiousDurationDays"] = 22
    with pytest.raises(ValueError):
        RunConfig(**d)


def test_invalid_reporting_fraction():
    d = get_valid_config_dict()
    d["reportingFraction"] = 0.009
    with pytest.raises(ValueError):
        RunConfig(**d)

    d["reportingFraction"] = 1.01
    with pytest.raises(ValueError):
        RunConfig(**d)

    d["reportingFraction"] = float("nan")
    with pytest.raises(ValueError):
        RunConfig(**d)


def test_impossible_population():
    d = get_valid_config_dict()
    d["population"]["value"] = 10
    d["susceptibleFraction"] = 0.99
    with pytest.raises(ValueError, match="impossible population"):
        RunConfig(**d)


def test_m2_min_days():
    d = get_valid_config_dict()
    d["modelType"] = "M2"
    d["dateRange"] = {"start": "2020-07-01", "end": "2020-07-20"}
    with pytest.raises(ValueError, match="M2 model requires at least 42 selected days"):
        RunConfig(**d)


def test_evaluate_min_days():
    d = get_valid_config_dict()
    d["mode"] = "EVALUATE"
    d["dateRange"] = {"start": "2020-07-01", "end": "2020-08-01"}
    with pytest.raises(ValueError, match="Evaluation requires a date range"):
        RunConfig(**d)


def test_config_hash_deterministic():
    d1 = get_valid_config_dict()
    c1 = RunConfig(**d1)
    hash1 = compute_config_hash(c1)

    d2 = get_valid_config_dict()
    c2 = RunConfig(**d2)
    hash2 = compute_config_hash(c2)

    assert hash1 == hash2
    assert len(hash1) == 64

    cache_key = compute_cache_key("ds_sha", hash1, "dev")
    assert len(cache_key) == 64

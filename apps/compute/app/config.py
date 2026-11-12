"""Run configuration schemas and canonical hashing (Pydantic v2)."""
import contextlib
import hashlib
import json
import math
import os
import subprocess
from datetime import date
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _check_finite(val: float, field_name: str) -> float:
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be a finite number (got {val})")
    return val


class PopulationProvenance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: int = Field(gt=0, description="Population count (must be positive integer)")
    sourceUrl: str = Field(description="Provenance source URL")
    referenceYear: int = Field(ge=1900, le=2100, description="Reference census or projection year")
    geography: str = Field(min_length=1, description="Geographic jurisdiction name")

    @field_validator("sourceUrl")
    @classmethod
    def validate_url(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("sourceUrl must be a valid http(s) URL")
        return v

    @field_validator("geography")
    @classmethod
    def validate_geography(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("geography must not be empty")
        return s


class DateRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: str = Field(description="ISO start date (YYYY-MM-DD)")
    end: str = Field(description="ISO end date (YYYY-MM-DD)")

    @field_validator("start", "end")
    @classmethod
    def validate_iso_date(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError as err:
            raise ValueError(f"Invalid ISO date string '{v}'") from err
        return v

    @model_validator(mode="after")
    def validate_order(self) -> "DateRange":
        d_start = date.fromisoformat(self.start)
        d_end = date.fromisoformat(self.end)
        if d_start >= d_end:
            raise ValueError("Start date must be strictly before end date")
        return self


class AdvancedConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    betaBounds: list[float] = Field(default_factory=lambda: [0.01, 2.0])
    initialInfectiousBounds: list[float] = Field(default_factory=lambda: [1.0, 100000.0])
    dispersionBounds: list[float] = Field(default_factory=lambda: [0.05, 1000.0])
    nStarts: int = Field(default=20, ge=1)
    seed: int = Field(default=42, ge=0)
    rtol: float = Field(default=1e-8, gt=0)
    atol: float = Field(default=1e-8, gt=0)
    cpMinSegmentDays: int = Field(default=21, ge=1)
    cpStepDays: int = Field(default=7, ge=1)
    cpSearchStarts: int = Field(default=5, ge=1)
    bootstrapStarts: int = Field(default=1, ge=1)
    bootstrapReplicates: int = Field(default=200, ge=1)

    @field_validator("betaBounds", "initialInfectiousBounds", "dispersionBounds")
    @classmethod
    def validate_bounds_pair(cls, v: list[float], info: Any) -> list[float]:
        if len(v) != 2:
            raise ValueError(f"{info.field_name} must have exactly 2 elements [lower, upper]")
        for elem in v:
            _check_finite(elem, info.field_name)
            if elem <= 0:
                raise ValueError(f"{info.field_name} elements must be strictly positive")
        if v[0] >= v[1]:
            raise ValueError(f"Lower bound must be strictly less than upper bound in {info.field_name}")
        return v

    @field_validator("rtol", "atol")
    @classmethod
    def validate_tolerances(cls, v: float, info: Any) -> float:
        _check_finite(v, info.field_name)
        if v <= 0:
            raise ValueError(f"{info.field_name} must be strictly positive")
        return v


class RunConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    datasetId: str = Field(min_length=1)
    dateRange: DateRange
    population: PopulationProvenance
    mode: Literal["FIT", "EVALUATE"]
    modelType: Literal["M1", "M2"] = "M1"
    infectiousDurationDays: int = Field(default=7, ge=3, le=21)
    reportingFraction: float = Field(default=0.20, ge=0.01, le=1.0)
    susceptibleFraction: float = Field(default=0.95, ge=0.01, le=0.999)
    uncertainty: Literal["OFF", "BOOTSTRAP"] = "OFF"
    advanced: AdvancedConfig = Field(default_factory=AdvancedConfig)

    @field_validator("reportingFraction", "susceptibleFraction")
    @classmethod
    def validate_fractions(cls, v: float, info: Any) -> float:
        return _check_finite(v, info.field_name)

    @model_validator(mode="after")
    def validate_cross_field(self) -> "RunConfig":
        N = self.population.value
        s_initial = self.susceptibleFraction * N
        remaining = N - s_initial

        if remaining < 1:
            raise ValueError("impossible population: N - S_initial must be at least 1 person")

        initial_i_upper = self.advanced.initialInfectiousBounds[1]
        if initial_i_upper > remaining:
            raise ValueError(
                f"initialInfectiousBounds upper bound ({initial_i_upper}) must be <= N - S_initial ({math.floor(remaining)})"
            )

        d_start = date.fromisoformat(self.dateRange.start)
        d_end = date.fromisoformat(self.dateRange.end)
        total_days = (d_end - d_start).days + 1

        if self.modelType == "M2" and total_days < 42:
            raise ValueError("M2 model requires at least 42 selected days")

        if self.mode == "EVALUATE" and total_days < 133:
            raise ValueError(
                "Evaluation requires a date range that yields at least 13 blocks and 42 initial training days (minimum 133 days)"
            )

        return self


def canonical_json_dumps(obj: Any) -> str:
    """Produce deterministic JSON with sorted keys and no extraneous whitespace."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def compute_config_hash(config: RunConfig | dict[str, Any]) -> str:
    """Compute sha256 hash of canonical JSON config."""
    if isinstance(config, RunConfig):
        data = config.model_dump(mode="json")
    else:
        data = config
    canonical_str = canonical_json_dumps(data)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def compute_cache_key(dataset_sha256: str, config_hash: str, code_version: str) -> str:
    """Compute deterministic cache key for run reuse."""
    raw = f"{dataset_sha256}:{config_hash}:{code_version}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_code_version() -> str:
    """Retrieve code version from CODE_REVISION env or git HEAD or default to 'dev'."""
    env_version = os.environ.get("CODE_REVISION")
    if env_version:
        return env_version.strip()
    with contextlib.suppress(Exception):
        git_sha = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if git_sha:
            return git_sha
    return "dev"


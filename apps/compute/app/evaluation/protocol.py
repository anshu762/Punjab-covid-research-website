"""Evaluation protocol: chronological rolling-origin evaluation with development/final split."""
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal


@dataclass
class EvaluationBlock:
    index: int  # 1-indexed (1..K)
    origin: str  # Last training date (ISO YYYY-MM-DD)
    training_start: str  # Start date of training prefix
    target_start: str  # origin + 1 day
    target_end: str  # origin + 7 days
    target_dates: list[str]  # 7 target dates
    split: Literal["development", "final"]


def _add_days(iso_date: str, days: int) -> str:
    d = date.fromisoformat(iso_date) + timedelta(days=days)
    return d.isoformat()


def _diff_days(start_iso: str, end_iso: str) -> int:
    d1 = date.fromisoformat(start_iso)
    d2 = date.fromisoformat(end_iso)
    return (d2 - d1).days


def generate_evaluation_blocks(
    start_date: str,
    end_date: str,
) -> tuple[list[EvaluationBlock], str]:
    """Generate chronological evaluation blocks.

    Default protocol:
    Start: 2020-07-01, End: 2020-11-30.
    Origins: 2020-08-31 and every 7 days through 2020-11-23 (exactly 13 origins).
    Blocks 1-9: development. Blocks 10-13: final.
    Protocol version: "v1-default".

    Custom protocol:
    Derive origins as start + initial_training_days - 1 stepping 7 days while origin + 7 <= end.
    Requires >= 13 blocks and >= 42 initial training days.
    Blocks 1..(K-4): development. Last 4: final.
    Protocol version: "custom".
    """
    is_default = (start_date == "2020-07-01" and end_date == "2020-11-30")

    if is_default:
        protocol_version = "v1-default"
        initial_training_days = 62  # 2020-07-01 to 2020-08-31 inclusive
    else:
        protocol_version = "custom"
        # Minimum required initial training days is 42
        initial_training_days = 62 if _diff_days(start_date, end_date) >= 152 else 42

    first_origin = _add_days(start_date, initial_training_days - 1)
    if initial_training_days < 42:
        raise ValueError("Evaluation protocol requires at least 42 initial training days")

    origins = []
    curr_origin = first_origin
    while _diff_days(curr_origin, end_date) >= 7:
        origins.append(curr_origin)
        curr_origin = _add_days(curr_origin, 7)

    if len(origins) < 13:
        raise ValueError(
            f"Evaluation protocol requires at least 13 complete blocks, but range yielded {len(origins)}"
        )

    num_blocks = len(origins)
    num_final = 4
    num_dev = num_blocks - num_final

    blocks: list[EvaluationBlock] = []
    for idx, origin in enumerate(origins, start=1):
        target_start = _add_days(origin, 1)
        target_end = _add_days(origin, 7)
        target_dates = [_add_days(origin, h) for h in range(1, 8)]
        split: Literal["development", "final"] = "development" if idx <= num_dev else "final"

        blocks.append(
            EvaluationBlock(
                index=idx,
                origin=origin,
                training_start=start_date,
                target_start=target_start,
                target_end=target_end,
                target_dates=target_dates,
                split=split,
            )
        )

    return blocks, protocol_version

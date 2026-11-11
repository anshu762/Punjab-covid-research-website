"""Data cleaning and normalization engine for EpiLens.

Implements PRD data cleaning rules:
- Calendar continuity check (missing dates and blanks are flagged as MISSING, analysis=None)
- Duplicate detection (flagged as DUPLICATE, analysis=None, blocking)
- 14-day lookback for negative corrections (chronological traversal, rollback on shortfall)
- Prefix independence for reliable training prefix evaluation
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum
from typing import Any


class QualityFlag(str, Enum):
    OK = "OK"
    MISSING = "MISSING"
    DUPLICATE = "DUPLICATE"
    CORRECTED = "CORRECTED"
    CORRECTION_DAY = "CORRECTION_DAY"
    UNRESOLVED_CORRECTION = "UNRESOLVED_CORRECTION"


@dataclass
class RawRecord:
    date: date
    value: int | None
    row_number: int  # 1-based file row incl. header (first data row = 2)


@dataclass
class AdjustmentEntry:
    date: str  # YYYY-MM-DD
    before: int
    after: int
    amount: int


@dataclass
class LogEntry:
    date: str  # YYYY-MM-DD
    kind: str  # ADJUSTMENT | CORRECTION_DAY | UNRESOLVED | DUPLICATE | MISSING
    message: str
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class Obs:
    date: str  # YYYY-MM-DD
    raw: int | None
    analysis: int | None
    flag: QualityFlag
    source_ref: str | None  # e.g. "row 42" or "rows 12, 57" or None
    transformation_id: str | None = None


@dataclass
class CorrectionRecord:
    date: str
    magnitude: int
    row_number: int
    status: str  # RESOLVED | UNRESOLVED
    adjustments: list[AdjustmentEntry] = field(default_factory=list)


@dataclass
class UnresolvedRecord:
    date: str
    row_number: int
    magnitude: int
    shortfall: int


@dataclass
class BlockingIssue:
    code: str  # MISSING_DATES | DUPLICATE_DATES | UNRESOLVED_CORRECTION
    message: str
    rows: list[int]
    dates: list[str]


@dataclass
class QualitySummary:
    record_count: int
    date_start: str | None
    date_end: str | None
    expected_days: int
    missing_days: list[str]
    duplicate_keys: list[dict[str, Any]]
    correction_magnitude: int
    corrections: list[CorrectionRecord]
    unresolved: list[UnresolvedRecord]
    blocking_issues: list[BlockingIssue]
    analysis_ready: bool


@dataclass
class NormalizationResult:
    observations: list[Obs]
    quality_log: list[LogEntry]
    summary: QualitySummary


def normalize(records: list[RawRecord], window_days: int = 14) -> NormalizationResult:
    """Normalize raw observation records into a continuous daily series with quality tracking.

    Rules:
    1. Duplicates on the same date: flag=DUPLICATE, raw=None, analysis=None. Blocks analysis.
    2. Missing dates & blank values: flag=MISSING, raw=None, analysis=None. Blocks analysis.
       Never converts blanks to zero.
    3. Negative values: look back day-by-day (t-1 .. t-window_days). Subtract from positive
       analysis values. If remaining > 0 at end of window: revert all adjustments made
       for this correction, flag=UNRESOLVED_CORRECTION, analysis=None. Blocks analysis.
       If remaining == 0: flag=CORRECTION_DAY, analysis=0, adjusted days flag=CORRECTED.
    4. Totals: correction_magnitude = sum of magnitudes of resolved corrections.
    """
    quality_log: list[LogEntry] = []

    if not records:
        summary = QualitySummary(
            record_count=0,
            date_start=None,
            date_end=None,
            expected_days=0,
            missing_days=[],
            duplicate_keys=[],
            correction_magnitude=0,
            corrections=[],
            unresolved=[],
            blocking_issues=[
                BlockingIssue(
                    code="MISSING_DATES",
                    message="No observation records provided.",
                    rows=[],
                    dates=[],
                )
            ],
            analysis_ready=False,
        )
        return NormalizationResult(observations=[], quality_log=[], summary=summary)

    # 1. Group records by date
    records_by_date: dict[date, list[RawRecord]] = {}
    for r in records:
        records_by_date.setdefault(r.date, []).append(r)

    min_date = min(records_by_date.keys())
    max_date = max(records_by_date.keys())
    expected_days = (max_date - min_date).days + 1

    missing_days_list: list[str] = []
    duplicate_keys_list: list[dict[str, Any]] = []
    missing_rows: list[int] = []
    duplicate_rows: list[int] = []

    # Prepare daily slots
    # Mapping: date -> mutable observation dict
    daily_slots: dict[date, dict[str, Any]] = {}

    curr_date = min_date
    while curr_date <= max_date:
        d_str = curr_date.isoformat()
        day_recs = records_by_date.get(curr_date)

        if not day_recs:
            # Calendar gap: missing date
            missing_days_list.append(d_str)
            quality_log.append(
                LogEntry(
                    date=d_str,
                    kind="MISSING",
                    message=f"Missing observation for date {d_str}",
                    details={"date": d_str},
                )
            )
            daily_slots[curr_date] = {
                "date": d_str,
                "raw": None,
                "analysis": None,
                "flag": QualityFlag.MISSING,
                "source_ref": None,
                "is_correction": False,
                "row_number": None,
            }
        elif len(day_recs) > 1:
            # Duplicate records
            rows = [r.row_number for r in day_recs]
            duplicate_rows.extend(rows)
            duplicate_keys_list.append({"date": d_str, "rows": rows})
            source_ref = f"rows {', '.join(str(row) for row in rows)}"
            quality_log.append(
                LogEntry(
                    date=d_str,
                    kind="DUPLICATE",
                    message=f"Duplicate records on {d_str}: {source_ref}",
                    details={"date": d_str, "rows": rows},
                )
            )
            daily_slots[curr_date] = {
                "date": d_str,
                "raw": None,
                "analysis": None,
                "flag": QualityFlag.DUPLICATE,
                "source_ref": source_ref,
                "is_correction": False,
                "row_number": rows[0],
            }
        else:
            # Exactly one record
            rec = day_recs[0]
            if rec.value is None:
                # Blank value -> treated as MISSING, never 0
                missing_days_list.append(d_str)
                missing_rows.append(rec.row_number)
                source_ref = f"row {rec.row_number}"
                quality_log.append(
                    LogEntry(
                        date=d_str,
                        kind="MISSING",
                        message=f"Blank observation on {source_ref} for date {d_str}",
                        details={"date": d_str, "row_number": rec.row_number},
                    )
                )
                daily_slots[curr_date] = {
                    "date": d_str,
                    "raw": None,
                    "analysis": None,
                    "flag": QualityFlag.MISSING,
                    "source_ref": source_ref,
                    "is_correction": False,
                    "row_number": rec.row_number,
                }
            elif rec.value < 0:
                # Negative correction day
                daily_slots[curr_date] = {
                    "date": d_str,
                    "raw": rec.value,
                    "analysis": rec.value,
                    "flag": QualityFlag.UNRESOLVED_CORRECTION,
                    "source_ref": f"row {rec.row_number}",
                    "is_correction": True,
                    "row_number": rec.row_number,
                }
            else:
                # Normal non-negative observation
                daily_slots[curr_date] = {
                    "date": d_str,
                    "raw": rec.value,
                    "analysis": rec.value,
                    "flag": QualityFlag.OK,
                    "source_ref": f"row {rec.row_number}",
                    "is_correction": False,
                    "row_number": rec.row_number,
                }

        curr_date += timedelta(days=1)

    # 2. Process negative corrections in chronological order
    corrections: list[CorrectionRecord] = []
    unresolved: list[UnresolvedRecord] = []
    unresolved_rows: list[int] = []
    unresolved_dates: list[str] = []
    resolved_correction_magnitude = 0

    curr_date = min_date
    while curr_date <= max_date:
        slot = daily_slots[curr_date]
        if slot["is_correction"]:
            d_str = curr_date.isoformat()
            magnitude = abs(slot["raw"])
            remaining = magnitude
            row_num = slot["row_number"]

            # Walk backwards up to window_days
            attempted_adjustments: list[tuple[date, int, int, int]] = []  # (date, before, after, take)

            step = 1
            while step <= window_days:
                past_date = curr_date - timedelta(days=step)
                if past_date < min_date:
                    break
                past_slot = daily_slots[past_date]
                c = past_slot["analysis"]

                # We can only subtract from positive integer analysis values
                if c is not None and c > 0:
                    take = min(c, remaining)
                    new_val = c - take
                    attempted_adjustments.append((past_date, c, new_val, take))
                    past_slot["analysis"] = new_val
                    remaining -= take
                    if remaining == 0:
                        break
                step += 1

            if remaining > 0:
                # Revert all adjustments made for this correction
                for p_date, before_val, _, _ in attempted_adjustments:
                    daily_slots[p_date]["analysis"] = before_val

                slot["flag"] = QualityFlag.UNRESOLVED_CORRECTION
                slot["analysis"] = None  # keep analysis=None
                unresolved_rows.append(row_num)
                unresolved_dates.append(d_str)

                unres_record = UnresolvedRecord(
                    date=d_str,
                    row_number=row_num,
                    magnitude=magnitude,
                    shortfall=remaining,
                )
                unresolved.append(unres_record)
                corrections.append(
                    CorrectionRecord(
                        date=d_str,
                        magnitude=magnitude,
                        row_number=row_num,
                        status="UNRESOLVED",
                        adjustments=[],
                    )
                )

                quality_log.append(
                    LogEntry(
                        date=d_str,
                        kind="UNRESOLVED",
                        message=(
                            f"Unresolved negative correction on {d_str} (row {row_num}): "
                            f"magnitude {magnitude}, shortfall {remaining} within {window_days}-day window."
                        ),
                        details={
                            "date": d_str,
                            "magnitude": magnitude,
                            "shortfall": remaining,
                            "row_number": row_num,
                        },
                    )
                )
            else:
                # Successfully resolved!
                slot["flag"] = QualityFlag.CORRECTION_DAY
                slot["analysis"] = 0
                resolved_correction_magnitude += magnitude

                resolved_adjustments: list[AdjustmentEntry] = []
                for p_date, before_val, after_val, take in attempted_adjustments:
                    p_slot = daily_slots[p_date]
                    # Update flag to CORRECTED if it was OK
                    if p_slot["flag"] == QualityFlag.OK:
                        p_slot["flag"] = QualityFlag.CORRECTED

                    adj_entry = AdjustmentEntry(
                        date=p_date.isoformat(),
                        before=before_val,
                        after=after_val,
                        amount=take,
                    )
                    resolved_adjustments.append(adj_entry)
                    quality_log.append(
                        LogEntry(
                            date=p_date.isoformat(),
                            kind="ADJUSTMENT",
                            message=(
                                f"Adjusted {p_date.isoformat()} by -{take} "
                                f"(from {before_val} to {after_val}) due to correction on {d_str}"
                            ),
                            details={
                                "target_date": p_date.isoformat(),
                                "correction_date": d_str,
                                "before": before_val,
                                "after": after_val,
                                "amount": take,
                            },
                        )
                    )

                corrections.append(
                    CorrectionRecord(
                        date=d_str,
                        magnitude=magnitude,
                        row_number=row_num,
                        status="RESOLVED",
                        adjustments=resolved_adjustments,
                    )
                )

                quality_log.append(
                    LogEntry(
                        date=d_str,
                        kind="CORRECTION_DAY",
                        message=(
                            f"Resolved negative correction on {d_str} (row {row_num}, magnitude {magnitude}) "
                            f"distributed across {len(resolved_adjustments)} day(s)."
                        ),
                        details={
                            "date": d_str,
                            "magnitude": magnitude,
                            "row_number": row_num,
                            "adjustments_count": len(resolved_adjustments),
                        },
                    )
                )

        curr_date += timedelta(days=1)

    # 3. Assemble observations list
    observations: list[Obs] = []
    curr_date = min_date
    while curr_date <= max_date:
        s = daily_slots[curr_date]
        observations.append(
            Obs(
                date=s["date"],
                raw=s["raw"],
                analysis=s["analysis"],
                flag=s["flag"],
                source_ref=s["source_ref"],
                transformation_id=None,
            )
        )
        curr_date += timedelta(days=1)

    # 4. Assemble blocking issues
    blocking_issues: list[BlockingIssue] = []

    if missing_days_list:
        blocking_issues.append(
            BlockingIssue(
                code="MISSING_DATES",
                message=f"{len(missing_days_list)} date(s) missing or blank in the observation range.",
                rows=sorted(missing_rows),
                dates=missing_days_list,
            )
        )

    if duplicate_keys_list:
        blocking_issues.append(
            BlockingIssue(
                code="DUPLICATE_DATES",
                message=f"{len(duplicate_keys_list)} date(s) have duplicate records.",
                rows=sorted(duplicate_rows),
                dates=[item["date"] for item in duplicate_keys_list],
            )
        )

    if unresolved:
        blocking_issues.append(
            BlockingIssue(
                code="UNRESOLVED_CORRECTION",
                message=(
                    f"{len(unresolved)} negative correction(s) could not be resolved "
                    f"within the {window_days}-day lookback window."
                ),
                rows=sorted(unresolved_rows),
                dates=unresolved_dates,
            )
        )

    analysis_ready = len(blocking_issues) == 0

    summary = QualitySummary(
        record_count=len(records),
        date_start=min_date.isoformat(),
        date_end=max_date.isoformat(),
        expected_days=expected_days,
        missing_days=missing_days_list,
        duplicate_keys=duplicate_keys_list,
        correction_magnitude=resolved_correction_magnitude,
        corrections=corrections,
        unresolved=unresolved,
        blocking_issues=blocking_issues,
        analysis_ready=analysis_ready,
    )

    return NormalizationResult(
        observations=observations,
        quality_log=quality_log,
        summary=summary,
    )

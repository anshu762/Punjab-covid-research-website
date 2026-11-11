"""Unit tests for the data cleaning and normalization engine."""

from datetime import date, timedelta

from app.data.cleaning import (
    NormalizationResult,
    QualityFlag,
    RawRecord,
    normalize,
)


def make_clean_records(start: str, counts: list[int | None]) -> list[RawRecord]:
    d = date.fromisoformat(start)
    records: list[RawRecord] = []
    for i, c in enumerate(counts):
        records.append(RawRecord(date=d + timedelta(days=i), value=c, row_number=i + 2))
    return records


def test_clean_baseline():
    records = make_clean_records("2020-07-01", [10, 20, 30, 40, 50])
    res: NormalizationResult = normalize(records)

    assert res.summary.analysis_ready is True
    assert len(res.summary.blocking_issues) == 0
    assert len(res.observations) == 5
    assert [o.analysis for o in res.observations] == [10, 20, 30, 40, 50]
    assert all(o.flag == QualityFlag.OK for o in res.observations)
    assert res.summary.expected_days == 5
    assert res.summary.record_count == 5


def test_missing_calendar_date():
    # Gap between 2020-07-01 and 2020-07-03 (missing 2020-07-02)
    records = [
        RawRecord(date=date(2020, 7, 1), value=10, row_number=2),
        RawRecord(date=date(2020, 7, 3), value=20, row_number=3),
    ]
    res = normalize(records)

    assert res.summary.analysis_ready is False
    assert len(res.summary.blocking_issues) == 1
    assert res.summary.blocking_issues[0].code == "MISSING_DATES"
    assert "2020-07-02" in res.summary.missing_days

    # 3 total slots
    assert len(res.observations) == 3
    missing_obs = res.observations[1]
    assert missing_obs.date == "2020-07-02"
    assert missing_obs.flag == QualityFlag.MISSING
    assert missing_obs.raw is None
    assert missing_obs.analysis is None


def test_blank_count_is_missing():
    # Value is None -> treated as MISSING, never zero
    records = [
        RawRecord(date=date(2020, 7, 1), value=10, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=None, row_number=3),
        RawRecord(date=date(2020, 7, 3), value=30, row_number=4),
    ]
    res = normalize(records)

    assert res.summary.analysis_ready is False
    assert "2020-07-02" in res.summary.missing_days
    blank_obs = res.observations[1]
    assert blank_obs.flag == QualityFlag.MISSING
    assert blank_obs.raw is None
    assert blank_obs.analysis is None
    assert blank_obs.source_ref == "row 3"


def test_duplicate_dates():
    # Duplicate on 2020-07-02
    records = [
        RawRecord(date=date(2020, 7, 1), value=10, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=20, row_number=3),
        RawRecord(date=date(2020, 7, 2), value=25, row_number=4),
        RawRecord(date=date(2020, 7, 3), value=30, row_number=5),
    ]
    res = normalize(records)

    assert res.summary.analysis_ready is False
    dup_issue = [b for b in res.summary.blocking_issues if b.code == "DUPLICATE_DATES"]
    assert len(dup_issue) == 1
    assert "2020-07-02" in dup_issue[0].dates
    assert dup_issue[0].rows == [3, 4]

    dup_obs = res.observations[1]
    assert dup_obs.flag == QualityFlag.DUPLICATE
    assert dup_obs.raw is None
    assert dup_obs.analysis is None
    assert dup_obs.source_ref == "rows 3, 4"


def test_resolved_negative_correction_single_day():
    # Day 1: 50, Day 2: -20 -> Day 1 becomes 30 (CORRECTED), Day 2 becomes 0 (CORRECTION_DAY)
    records = [
        RawRecord(date=date(2020, 7, 1), value=50, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=-20, row_number=3),
    ]
    res = normalize(records)

    assert res.summary.analysis_ready is True
    assert res.summary.correction_magnitude == 20
    assert len(res.summary.corrections) == 1
    assert res.summary.corrections[0].status == "RESOLVED"
    assert len(res.summary.unresolved) == 0

    obs1 = res.observations[0]
    assert obs1.raw == 50
    assert obs1.analysis == 30
    assert obs1.flag == QualityFlag.CORRECTED

    obs2 = res.observations[1]
    assert obs2.raw == -20
    assert obs2.analysis == 0
    assert obs2.flag == QualityFlag.CORRECTION_DAY


def test_resolved_negative_correction_multiple_days():
    # Day 1: 10, Day 2: 15, Day 3: -20
    # Search backwards:
    # Day 2 takes min(15, 20) = 15, analysis becomes 0. Remaining = 5.
    # Day 1 takes min(10, 5) = 5, analysis becomes 5. Remaining = 0.
    records = [
        RawRecord(date=date(2020, 7, 1), value=10, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=15, row_number=3),
        RawRecord(date=date(2020, 7, 3), value=-20, row_number=4),
    ]
    res = normalize(records)

    assert res.summary.analysis_ready is True
    assert res.summary.correction_magnitude == 20
    assert res.observations[0].analysis == 5
    assert res.observations[0].flag == QualityFlag.CORRECTED
    assert res.observations[1].analysis == 0
    assert res.observations[1].flag == QualityFlag.CORRECTED
    assert res.observations[2].analysis == 0
    assert res.observations[2].flag == QualityFlag.CORRECTION_DAY


def test_unresolved_correction_lookback_shortfall_rollback():
    # Negative correction of -50 with only 30 available in prior days
    # Must completely rollback all adjustments and mark UNRESOLVED
    records = [
        RawRecord(date=date(2020, 7, 1), value=10, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=20, row_number=3),
        RawRecord(date=date(2020, 7, 3), value=-50, row_number=4),
    ]
    res = normalize(records)

    assert res.summary.analysis_ready is False
    assert len(res.summary.unresolved) == 1
    assert res.summary.unresolved[0].shortfall == 20
    assert res.summary.unresolved[0].magnitude == 50

    # Rolled back: Day 1 stays 10, Day 2 stays 20
    assert res.observations[0].analysis == 10
    assert res.observations[0].flag == QualityFlag.OK
    assert res.observations[1].analysis == 20
    assert res.observations[1].flag == QualityFlag.OK

    # Day 3 has analysis=None and flag=UNRESOLVED_CORRECTION
    assert res.observations[2].raw == -50
    assert res.observations[2].analysis is None
    assert res.observations[2].flag == QualityFlag.UNRESOLVED_CORRECTION


def test_correction_skips_blanks_and_missing_days():
    # Day 1: 50, Day 2: None (blank), Day 3: -20
    # Lookback from Day 3 skips Day 2 and takes 20 from Day 1
    records = [
        RawRecord(date=date(2020, 7, 1), value=50, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=None, row_number=3),
        RawRecord(date=date(2020, 7, 3), value=-20, row_number=4),
    ]
    res = normalize(records)

    # Day 2 is missing, so overall analysis_ready is False due to missing date
    assert "2020-07-02" in res.summary.missing_days

    # But the correction itself resolved against Day 1
    assert res.observations[0].analysis == 30
    assert res.observations[0].flag == QualityFlag.CORRECTED
    assert res.observations[2].analysis == 0
    assert res.observations[2].flag == QualityFlag.CORRECTION_DAY


def test_window_days_limit():
    # Window of 2 days: Day 1 (t-3) is outside window, Day 2 & 3 (t-2, t-1) have insufficient counts
    records = [
        RawRecord(date=date(2020, 7, 1), value=100, row_number=2),
        RawRecord(date=date(2020, 7, 2), value=5, row_number=3),
        RawRecord(date=date(2020, 7, 3), value=5, row_number=4),
        RawRecord(date=date(2020, 7, 4), value=-20, row_number=5),
    ]
    res = normalize(records, window_days=2)

    # Lookback only reaches Day 3 and Day 2 (total 10 < 20). Day 1 is outside window.
    # Shortfall = 10 -> rollback!
    assert res.summary.analysis_ready is False
    assert len(res.summary.unresolved) == 1
    assert res.observations[1].analysis == 5
    assert res.observations[2].analysis == 5
    assert res.observations[3].analysis is None


def test_prefix_independence():
    # Running normalize on prefix [0..T] yields identical trajectory for [0..T]
    full_counts = [20, 30, 25, 40, -10, 35, 50, 45, 60]
    records = make_clean_records("2020-07-01", full_counts)

    res_full = normalize(records)
    assert res_full.summary.analysis_ready is True

    # Prefix up to Day 5 (index 4, which is the negative correction)
    prefix_records = records[:5]
    res_prefix = normalize(prefix_records)
    assert res_prefix.summary.analysis_ready is True

    # The analysis values for the first 5 days should match exactly
    for i in range(5):
        assert res_full.observations[i].analysis == res_prefix.observations[i].analysis
        assert res_full.observations[i].flag == res_prefix.observations[i].flag

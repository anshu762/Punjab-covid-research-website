"""Unit tests for CSV I/O, PII detection, and safe formula export."""

import pytest

from app.data.csv_io import (
    CsvValidationError,
    find_forbidden_pii_columns,
    parse_and_validate_csv,
    suggest_column_mapping,
)
from app.data.safe_csv import neutralize, safe_filename


def test_neutralize_formula_injection():
    # Dangerous formula prefixes
    assert neutralize("=1+1") == "'=1+1"
    assert neutralize("+SUM(A1:B2)") == "'+SUM(A1:B2)"
    assert neutralize("@SUM(A1)") == "'@SUM(A1)"
    assert neutralize("\tcmd.exe") == "'\tcmd.exe"
    assert neutralize("\rpowershell") == "'\rpowershell"
    assert neutralize("-2+5") == "'-2+5"

    # Numbers and floats are preserved unmodified
    assert neutralize(42) == 42
    assert neutralize(-15) == -15
    assert neutralize(3.14) == 3.14
    assert neutralize(None) is None
    assert neutralize(True) is True

    # Numeric strings are preserved unmodified
    assert neutralize("100") == "100"
    assert neutralize("-100") == "-100"
    assert neutralize("+50") == "+50"
    assert neutralize("3.1415") == "3.1415"

    # Harmless text
    assert neutralize("Normal string") == "Normal string"
    assert neutralize("Punjab, India") == "Punjab, India"


def test_safe_filename():
    assert safe_filename("../../etc/passwd.csv") == "passwd.csv"
    assert safe_filename("data\\windows\\test.csv") == "test.csv"
    assert safe_filename("good-name_2020.csv") == "good-name_2020.csv"
    assert safe_filename("") == "dataset.csv"
    assert safe_filename("foo\x00bar.csv") == "foobar.csv"
    assert safe_filename("...hidden.csv") == "hidden.csv"


def test_pii_rejection():
    headers_ok = ["Date", "Daily Confirmed", "Region"]
    assert find_forbidden_pii_columns(headers_ok) == []

    headers_pii = ["Date", "Patient Name", "Confirmed", "Aadhar Number"]
    bad = find_forbidden_pii_columns(headers_pii)
    assert "Patient Name" in bad
    assert "Aadhar Number" in bad

    csv_content = b"Date,Patient Name,Confirmed\n2020-07-01,John Doe,10\n"
    with pytest.raises(CsvValidationError) as exc_info:
        parse_and_validate_csv(csv_content, {"date": "Date", "new_confirmed": "Confirmed"})
    assert exc_info.value.code == "identifiers_not_allowed"


def test_suggest_mapping():
    headers = ["Observation Date", "Daily Confirmed Cases", "State Code", "Other"]
    mapping = suggest_column_mapping(headers)
    assert mapping["date"] == "Observation Date"
    assert mapping["new_confirmed"] == "Daily Confirmed Cases"
    assert mapping["region_code"] == "State Code"


def test_parse_csv_valid_utf8_and_bom():
    # UTF-8 with BOM
    bom = b"\xef\xbb\xbf"
    csv_bytes = bom + b"Date,Confirmed,State\n2020-07-01,15,PB\n2020-07-02,25,pb\n"
    mapping = {"date": "Date", "new_confirmed": "Confirmed", "region_code": "State"}

    records, errors = parse_and_validate_csv(csv_bytes, mapping)
    assert len(errors) == 0
    assert len(records) == 2
    assert records[0].value == 15
    assert records[1].value == 25


def test_parse_csv_row_errors():
    csv_text = (
        "Date,Confirmed,State\n"
        "2020-07-01,10,PB\n"
        "not-a-date,15,PB\n"
        "2020-07-03,invalid_count,PB\n"
        "2020-07-04,20,DL\n"  # wrong region (not PB)
        "2020-07-05,,PB\n"     # blank count -> allowed as None
    )
    mapping = {"date": "Date", "new_confirmed": "Confirmed", "region_code": "State"}

    records, errors = parse_and_validate_csv(csv_text, mapping)

    error_codes = {e["code"]: e for e in errors}
    assert "invalid_date" in error_codes
    assert 3 in error_codes["invalid_date"]["rows"]

    assert "invalid_count" in error_codes
    assert 4 in error_codes["invalid_count"]["rows"]

    assert "wrong_region" in error_codes
    assert 5 in error_codes["wrong_region"]["rows"]

    # Valid rows parsed: row 2 and row 6 (blank count is None)
    assert len(records) == 2
    assert records[0].value == 10
    assert records[1].value is None

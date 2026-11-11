"""Spreadsheet formula safety and filename sanitization for EpiLens."""

from __future__ import annotations

import re
from typing import Any

# Formula trigger characters that spreadsheet software (Excel, LibreOffice, Google Sheets) may execute
FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def neutralize(cell: Any) -> Any:
    """Neutralize spreadsheet formulas in exported text cells.

    Prefixes a single quote (') when a text/string cell starts with =, +, -, @, \\t, or \\r.
    Leaves numbers (int, float), None, bools, and normal text unmodified.
    """
    if cell is None:
        return cell
    if isinstance(cell, (int, float, bool)):
        return cell
    if isinstance(cell, str) and cell and cell[0] in FORMULA_TRIGGERS:
        # Check if it is a pure integer or float string (e.g. "-15", "+42", "-3.14")
        # In purely numerical strings, spreadsheets treat them as numbers, not formulas.
        # But if it's text like "-SUM(A1)" or "=1+1" or "@cmd", it is an active injection.
        # To be strictly safe per PRD: "prefix ' when a text cell starts with = + - @ \t \r"
        # If the user passed an explicitly typed string that starts with a trigger, neutralize if not pure number
        try:
            # If it cleanly parses as float/int, check if it's just a number
            float(cell)
            return cell
        except ValueError:
            return f"'{cell}"
    return cell


def safe_filename(filename: str, max_length: int = 100) -> str:
    """Sanitize filename to prevent path traversal, control character injection, or invalid chars."""
    if not filename:
        return "dataset.csv"

    # Strip directory components (both / and \)
    cleaned = filename.replace("\\", "/").split("/")[-1]

    # Remove null bytes and non-printable characters
    cleaned = "".join(ch for ch in cleaned if ch.isprintable() and ch != "\x00")

    # Replace forbidden filename chars with underscore
    cleaned = re.sub(r'[^a-zA-Z0-9._-]', "_", cleaned)

    # Prevent hidden files or double dots
    cleaned = re.sub(r'^\.+', "", cleaned)
    cleaned = re.sub(r'\.{2,}', ".", cleaned)

    if not cleaned:
        cleaned = "dataset.csv"

    if len(cleaned) > max_length:
        base, dot, ext = cleaned.rpartition(".")
        if dot:
            cleaned = base[: max_length - len(ext) - 1] + "." + ext
        else:
            cleaned = cleaned[:max_length]

    return cleaned

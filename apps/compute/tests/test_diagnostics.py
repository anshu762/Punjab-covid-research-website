"""Unit tests for diagnostics calculation."""
import numpy as np
import pytest

from app.diagnostics import assess_diagnostics_status, compute_residuals_and_acf


def test_residuals_and_acf():
    y = np.array([10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0])
    mu = np.array([12.0, 18.0, 32.0, 38.0, 52.0, 58.0, 72.0, 78.0])
    k = 10.0

    res_list, acf_list, limit = compute_residuals_and_acf(y, mu, k, max_lag=3)
    assert len(res_list) == 8
    assert len(acf_list) == 3
    assert limit == pytest.approx(1.96 / (8 ** 0.5))

    for item in res_list:
        assert "raw" in item
        assert "pearson" in item


def test_assess_diagnostics_status():
    conv_ok = {"nStarts": 20, "nConverged": 18}
    status, warnings = assess_diagnostics_status(conv_ok, [], [], 0.5, bootstrap_reliable=True)
    assert status == "ok"
    assert len(warnings) == 0

    conv_low = {"nStarts": 20, "nConverged": 5}
    status_w, warnings_w = assess_diagnostics_status(conv_low, [], [], 0.5, bootstrap_reliable=True)
    assert status_w == "warnings"
    assert any("Low convergence" in w for w in warnings_w)

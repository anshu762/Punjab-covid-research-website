"""Unit tests for Negative Binomial likelihood."""
import numpy as np
from scipy.stats import nbinom

from app.models.likelihood import PENALTY_NLL, compute_nll, nb_logpmf


def test_nb_logpmf_matches_scipy():
    y = np.array([0, 1, 5, 20, 100, 500])
    mu = np.array([0.5, 2.0, 10.0, 25.0, 80.0, 450.0])
    k = 5.0

    # scipy parameters: n = k, p = k / (k + mu)
    p = k / (k + mu)
    expected_scipy = nbinom.logpmf(y, n=k, p=p)
    actual = nb_logpmf(y, mu, k)

    np.testing.assert_allclose(actual, expected_scipy, rtol=1e-8)


def test_nb_logpmf_at_zero():
    """Verify logpmf is finite and accurate when y = 0."""
    actual = nb_logpmf(0.0, 10.0, 2.0)
    p = 2.0 / (2.0 + 10.0)
    expected = nbinom.logpmf(0, n=2.0, p=p)
    assert np.isfinite(actual)
    np.testing.assert_allclose(actual, expected, rtol=1e-8)


def test_compute_nll_penalties():
    y_obs = np.array([10, 20, 30])

    # Non-finite expected cases
    bad_mu = np.array([10.0, np.nan, 30.0])
    assert compute_nll(y_obs, bad_mu, 5.0) == PENALTY_NLL

    # Negative expected cases
    neg_mu = np.array([10.0, -1.0, 30.0])
    assert compute_nll(y_obs, neg_mu, 5.0) == PENALTY_NLL

    # Invalid dispersion k
    good_mu = np.array([10.0, 20.0, 30.0])
    assert compute_nll(y_obs, good_mu, -1.0) == PENALTY_NLL
    assert compute_nll(y_obs, good_mu, 0.0) == PENALTY_NLL

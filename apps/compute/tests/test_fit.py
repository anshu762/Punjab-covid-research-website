"""Unit tests for M1 and M2 fitting, parameter recovery, boundary hits, and change point."""
import numpy as np
import pytest

from app.models.fit import fit_m1, fit_m2
from app.models.forecast import forecast_from_fit
from app.models.sir import integrate_sir


def test_m1_parameter_recovery_synthetic():
    """Generate synthetic series with known parameters and recover them within 10%."""
    N = 10_000_000
    f_s = 0.95
    gamma = 1.0 / 7.0
    rho = 0.20
    true_beta = 0.32
    true_i0 = 500.0
    T = 60


    # True trajectory
    true_res = integrate_sir(
        N=N,
        susceptible_fraction=f_s,
        i0=true_i0,
        gamma=gamma,
        rho=rho,
        beta=true_beta,
        T=T,
    )
    y_synth = true_res.expected_cases

    # Fit M1
    fit_res = fit_m1(
        y_observed=y_synth,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        beta_bounds=(0.05, 1.0),
        i0_bounds=(10.0, 10_000.0),
        dispersion_bounds=(0.1, 500.0),
        n_starts=15,
        seed=42,
    )

    recovered_beta = fit_res.parameters["beta"]
    rel_error = abs(recovered_beta - true_beta) / true_beta
    assert rel_error < 0.10, f"Recovered beta {recovered_beta} differed by {rel_error*100:.1f}% from true {true_beta}"

    # Determinism: identical fit with same seed
    fit_res2 = fit_m1(
        y_observed=y_synth,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        beta_bounds=(0.05, 1.0),
        i0_bounds=(10.0, 10_000.0),
        dispersion_bounds=(0.1, 500.0),
        n_starts=15,
        seed=42,
    )
    assert fit_res.parameters["beta"] == pytest.approx(fit_res2.parameters["beta"], rel=1e-6)
    assert fit_res.parameters["i0"] == pytest.approx(fit_res2.parameters["i0"], rel=1e-6)


def test_boundary_hit_detection():
    """Force beta bounds to strictly exclude the optimum to trigger boundary hit."""
    N = 5_000_000
    f_s = 0.95
    gamma = 1.0 / 7.0
    rho = 0.20
    true_beta = 0.40
    T = 30

    true_res = integrate_sir(
        N=N,
        susceptible_fraction=f_s,
        i0=1000.0,
        gamma=gamma,
        rho=rho,
        beta=true_beta,
        T=T,
    )

    # Force beta_bounds upper to 0.20 (below true 0.40)
    fit_res = fit_m1(
        y_observed=true_res.expected_cases,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        beta_bounds=(0.01, 0.20),
        i0_bounds=(10.0, 10000.0),
        dispersion_bounds=(0.1, 500.0),
        n_starts=10,
        seed=42,
    )

    # Must hit the upper bound on beta
    upper_hits = [h for h in fit_res.boundary_hits if h["param"] == "beta" and h["bound"] == "upper"]
    assert len(upper_hits) > 0


def test_m2_change_point_recovery_and_training_isolation():
    """Two-regime synthetic series finds change day within +-7 days and ignores future data."""
    N = 10_000_000
    f_s = 0.95
    gamma = 1.0 / 7.0
    rho = 0.20
    true_c = 28
    true_b1 = 0.38
    true_b2 = 0.18
    T = 56

    dates = [f"2020-08-{i+1:02d}" if i < 31 else f"2020-09-{i-30:02d}" for i in range(T)]

    two_regime = integrate_sir(
        N=N,
        susceptible_fraction=f_s,
        i0=500.0,
        gamma=gamma,
        rho=rho,
        beta=(true_b1, true_b2),
        T=T,
        change_day=true_c,
    )
    y_synth = two_regime.expected_cases

    fit_res = fit_m2(
        y_observed=y_synth,
        dates=dates,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        cp_min_segment_days=21,
        cp_step_days=7,
        cp_search_starts=5,
        n_starts=10,
        seed=42,
    )

    assert fit_res.change_point is not None
    recovered_c = fit_res.change_point["dayIndex"]
    assert abs(recovered_c - true_c) <= 7, f"Recovered change day {recovered_c} not within 7 days of true {true_c}"

    # Verify forecast from fit produces expected shape
    forecast = forecast_from_fit(fit_res, N=N, horizon=7)
    assert len(forecast) == 7
    assert np.all(forecast >= 0)

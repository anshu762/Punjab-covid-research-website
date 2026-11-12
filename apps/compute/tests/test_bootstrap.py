"""Unit tests for parametric bootstrap."""
import numpy as np

from app.models.fit import fit_m1
from app.models.sir import integrate_sir
from app.uncertainty.bootstrap import run_parametric_bootstrap


def test_bootstrap_reproducibility_and_reliable_threshold():
    N = 10_000_000
    f_s = 0.95
    gamma = 1.0 / 7.0
    rho = 0.20
    true_beta = 0.30
    T = 28

    sim = integrate_sir(
        N=N,
        susceptible_fraction=f_s,
        i0=500.0,
        gamma=gamma,
        rho=rho,
        beta=true_beta,
        T=T,
    )

    fit = fit_m1(
        y_observed=sim.expected_cases,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        n_starts=5,
        seed=42,
    )

    # Run small bootstrap (e.g. 5 replicates) to verify reproducibility and structure
    b_res1 = run_parametric_bootstrap(
        fit=fit,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        n_replicates=5,
        bootstrap_starts=1,
        seed=100,
        forecast_horizon=7,
    )
    b_res2 = run_parametric_bootstrap(
        fit=fit,
        N=N,
        susceptible_fraction=f_s,
        gamma=gamma,
        rho=rho,
        n_replicates=5,
        bootstrap_starts=1,
        seed=100,
        forecast_horizon=7,
    )

    assert b_res1.succeeded == 5
    assert len(b_res1.draws) == 5
    # Reliable flag requires >= 180
    assert b_res1.reliable is False
    assert "interpret intervals with caution" in b_res1.message

    # Reproducible intervals
    np.testing.assert_allclose(b_res1.fit_lower, b_res2.fit_lower, rtol=1e-5)
    np.testing.assert_allclose(b_res1.forecast_lower, b_res2.forecast_lower, rtol=1e-5)
    assert len(b_res1.forecast_lower) == 7
    assert len(b_res1.fit_lower) == T

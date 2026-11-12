"""Unit tests for SIR ODE equations and numerical invariants."""
import numpy as np

from app.models.sir import integrate_sir, simulate_forward


def test_conservation_and_non_negativity():
    N = 20_000_000
    susceptible_fraction = 0.95
    i0 = 500.0
    gamma = 1.0 / 7.0
    rho = 0.20
    beta = 0.35
    T = 60

    result = integrate_sir(
        N=N,
        susceptible_fraction=susceptible_fraction,
        i0=i0,
        gamma=gamma,
        rho=rho,
        beta=beta,
        T=T,
    )

    total_pop = result.S + result.I + result.R
    # S + I + R = N within 1e-6 * N
    np.testing.assert_allclose(total_pop, N, rtol=1e-6, atol=1e-6 * N)

    # All state variables non-negative
    assert np.all(result.S >= 0)
    assert np.all(result.I >= 0)
    assert np.all(result.R >= 0)
    assert np.all(result.C >= 0)

    # C is monotone non-decreasing
    assert np.all(np.diff(result.C) >= -1e-9)

    # Expected cases equals rho * (C[d+1] - C[d])
    delta_C = np.diff(result.C)
    np.testing.assert_allclose(result.expected_cases, rho * delta_C, atol=1e-9)


def test_zero_beta_exponential_decay():
    N = 10_000_000
    susceptible_fraction = 0.90
    i0 = 10_000.0
    gamma = 1.0 / 7.0
    rho = 0.25
    beta = 0.0
    T = 21

    result = integrate_sir(
        N=N,
        susceptible_fraction=susceptible_fraction,
        i0=i0,
        gamma=gamma,
        rho=rho,
        beta=beta,
        T=T,
    )

    # When beta = 0, no new infections occur -> delta C = 0 -> mu = 0
    np.testing.assert_allclose(result.expected_cases, 0.0, atol=1e-9)
    assert np.allclose(result.S, susceptible_fraction * N, atol=1e-6)

    # I decays exponentially: I(t) = I0 * exp(-gamma * t)
    t = np.arange(0, T + 1)
    expected_I = i0 * np.exp(-gamma * t)
    np.testing.assert_allclose(result.I, expected_I, rtol=5e-4)



def test_piecewise_beta_continuity():
    N = 5_000_000
    susceptible_fraction = 0.95
    i0 = 1000.0
    gamma = 1.0 / 7.0
    rho = 0.20
    T = 50
    change_day = 25
    beta1 = 0.40
    beta2 = 0.20

    result = integrate_sir(
        N=N,
        susceptible_fraction=susceptible_fraction,
        i0=i0,
        gamma=gamma,
        rho=rho,
        beta=(beta1, beta2),
        T=T,
        change_day=change_day,
    )

    assert len(result.S) == T + 1
    assert len(result.expected_cases) == T
    assert len(result.beta) == T

    # Check beta values across change day
    np.testing.assert_allclose(result.beta[:change_day], beta1)
    np.testing.assert_allclose(result.beta[change_day:], beta2)

    # Conservation holds strictly across piecewise junction
    np.testing.assert_allclose(result.S + result.I + result.R, N, rtol=1e-6, atol=1e-6 * N)


def test_scaling_invariance():
    """Simulate with N=1,000,000 vs N=10,000,000 with identical fractional states."""
    f_s = 0.95
    gamma = 1.0 / 7.0
    rho = 0.20
    beta = 0.30
    T = 30

    res1 = integrate_sir(N=1_000_000, susceptible_fraction=f_s, i0=1_000.0, gamma=gamma, rho=rho, beta=beta, T=T)
    res2 = integrate_sir(N=10_000_000, susceptible_fraction=f_s, i0=10_000.0, gamma=gamma, rho=rho, beta=beta, T=T)

    # Fractional expected cases must match identically
    frac1 = res1.expected_cases / 1_000_000
    frac2 = res2.expected_cases / 10_000_000
    np.testing.assert_allclose(frac1, frac2, rtol=1e-5)


def test_simulate_forward():
    state = {"S": 9_000_000.0, "I": 50_000.0, "R": 950_000.0, "C": 100_000.0}
    res = simulate_forward(
        state=state,
        beta=0.25,
        days=7,
        gamma=1.0 / 7.0,
        rho=0.20,
        N=10_000_000,
    )
    assert len(res.expected_cases) == 7
    assert len(res.S) == 8
    assert np.all(res.expected_cases >= 0)

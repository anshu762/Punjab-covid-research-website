"""SIR ODE numerical integration and incidence calculation."""
from dataclasses import dataclass

import numpy as np
from scipy.integrate import solve_ivp


@dataclass
class SIRResult:
    S: np.ndarray  # persons, length T+1
    I: np.ndarray  # persons, length T+1
    R: np.ndarray  # persons, length T+1
    C: np.ndarray  # cumulative infections, persons, length T+1
    expected_cases: np.ndarray  # rho * (C[d+1] - C[d]), length T
    beta: np.ndarray  # transmission parameter per day, length T
    r_eff: np.ndarray  # beta * S / (gamma * N), length T


def _sir_ode(t: float, y: np.ndarray, beta: float, gamma: float) -> list[float]:
    """Scaled SIR system: y = [s, i, r, c]. All state variables normalized by N."""
    s, i, _r, _c = y
    # Prevent negative states from causing runaway instabilities
    s_clamped = max(0.0, s)
    i_clamped = max(0.0, i)
    infection_rate = beta * s_clamped * i_clamped
    ds_dt = -infection_rate
    di_dt = infection_rate - gamma * i_clamped
    dr_dt = gamma * i_clamped
    dc_dt = infection_rate
    return [ds_dt, di_dt, dr_dt, dc_dt]


def _integrate_segment(
    y0: list[float],
    t_span: tuple[float, float],
    t_eval: np.ndarray,
    beta: float,
    gamma: float,
    rtol: float = 1e-8,
    atol: float = 1e-8,
) -> np.ndarray:
    """Integrate a single segment where beta is constant."""
    try:
        sol = solve_ivp(
            fun=lambda t, y: _sir_ode(t, y, beta, gamma),
            t_span=t_span,
            y0=y0,
            method="LSODA",
            t_eval=t_eval,
            rtol=rtol,
            atol=atol,
        )
        if not sol.success or sol.y is None or sol.y.shape[1] != len(t_eval):
            raise RuntimeError(f"LSODA failed: {sol.message}")
        return sol.y
    except Exception:  # noqa: BLE001
        # Fall back to RK45 if LSODA fails or encounters stiff solver issues

        sol = solve_ivp(
            fun=lambda t, y: _sir_ode(t, y, beta, gamma),
            t_span=t_span,
            y0=y0,
            method="RK45",
            t_eval=t_eval,
            rtol=rtol,
            atol=atol,
        )
        if not sol.success or sol.y is None or sol.y.shape[1] != len(t_eval):
            raise RuntimeError(f"ODE integration failed with both LSODA and RK45: {sol.message}")
        return sol.y


def integrate_sir(
    N: int,
    susceptible_fraction: float,
    i0: float,
    gamma: float,
    rho: float,
    beta: float | tuple[float, float],
    T: int,
    change_day: int | None = None,
    rtol: float = 1e-8,
    atol: float = 1e-8,
) -> SIRResult:
    """Integrate SIR equations over T days (day boundaries 0..T).

    Parameters
    ----------
    N : int
        Total population.
    susceptible_fraction : float
        Initial susceptible fraction f_s. S0 = f_s * N.
    i0 : float
        Initial infectious count I0 in persons.
    gamma : float
        Recovery rate (gamma = 1 / infectious_duration).
    rho : float
        Reporting fraction.
    beta : float or tuple[float, float]
        M1: float (beta).
        M2: tuple (beta1, beta2).
    T : int
        Number of days to simulate (output length T+1).
    change_day : int or None
        For M2: integer day boundary c where beta switches from beta1 to beta2 (0 < c < T).
    """
    if T <= 0:
        raise ValueError(f"T must be positive, got {T}")
    if N <= 0:
        raise ValueError(f"N must be positive, got {N}")

    s0 = susceptible_fraction
    scaled_i0 = i0 / N
    r0 = max(0.0, 1.0 - s0 - scaled_i0)
    c0 = 0.0
    y0 = [s0, scaled_i0, r0, c0]

    is_m2 = change_day is not None and isinstance(beta, (tuple, list)) and len(beta) == 2

    if not is_m2:
        # M1: single segment
        single_beta = float(beta[0]) if isinstance(beta, (tuple, list)) else float(beta)
        t_eval = np.arange(0, T + 1, dtype=float)
        sol_y = _integrate_segment(
            y0=y0,
            t_span=(0.0, float(T)),
            t_eval=t_eval,
            beta=single_beta,
            gamma=gamma,
            rtol=rtol,
            atol=atol,
        )
        beta_arr = np.full(T, single_beta, dtype=float)
    else:
        # M2: piecewise constant across change_day
        c = int(change_day)  # type: ignore[arg-type]
        if c <= 0 or c >= T:
            raise ValueError(f"change_day {c} must be strictly between 0 and T={T}")

        beta1 = float(beta[0])
        beta2 = float(beta[1])

        t_eval1 = np.arange(0, c + 1, dtype=float)
        sol_y1 = _integrate_segment(
            y0=y0,
            t_span=(0.0, float(c)),
            t_eval=t_eval1,
            beta=beta1,
            gamma=gamma,
            rtol=rtol,
            atol=atol,
        )

        y_c = sol_y1[:, -1].tolist()
        t_eval2 = np.arange(c, T + 1, dtype=float)
        sol_y2 = _integrate_segment(
            y0=y_c,
            t_span=(float(c), float(T)),
            t_eval=t_eval2,
            beta=beta2,
            gamma=gamma,
            rtol=rtol,
            atol=atol,
        )

        # Concatenate: sol_y1 has indices 0..c, sol_y2 has c..T. Drop index 0 of sol_y2.
        sol_y = np.hstack([sol_y1, sol_y2[:, 1:]])
        beta_arr = np.empty(T, dtype=float)
        beta_arr[:c] = beta1
        beta_arr[c:] = beta2

    # Scale back to persons and enforce non-negativity
    S = np.clip(sol_y[0] * N, 0.0, N)
    I = np.clip(sol_y[1] * N, 0.0, N)
    R = np.clip(sol_y[2] * N, 0.0, N)
    C = np.maximum.accumulate(sol_y[3] * N)

    # Expected reported cases for day d: mu_d = rho * (C[d+1] - C[d])
    delta_C = np.diff(C)
    expected_cases = np.clip(rho * delta_C, 0.0, None)

    # Effective reproduction number R_eff(t_d) = beta(t_d) * S(t_d) / (gamma * N)
    r_eff = (beta_arr * S[:-1]) / (gamma * N)

    return SIRResult(
        S=S,
        I=I,
        R=R,
        C=C,
        expected_cases=expected_cases,
        beta=beta_arr,
        r_eff=r_eff,
    )


def simulate_forward(
    state: dict[str, float],
    beta: float,
    days: int,
    gamma: float,
    rho: float,
    N: int,
    rtol: float = 1e-8,
    atol: float = 1e-8,
) -> SIRResult:
    """Continue SIR forward simulation from an arbitrary state {S, I, R, C}.

    Used for 7-day held-out forecasts and forward policy scenarios.
    """
    if days <= 0:
        raise ValueError(f"days must be positive, got {days}")
    if N <= 0:
        raise ValueError(f"N must be positive, got {N}")

    s0 = state["S"] / N
    i0 = state["I"] / N
    r0 = state["R"] / N
    c0 = state.get("C", 0.0) / N

    y0 = [s0, i0, r0, c0]
    t_eval = np.arange(0, days + 1, dtype=float)

    sol_y = _integrate_segment(
        y0=y0,
        t_span=(0.0, float(days)),
        t_eval=t_eval,
        beta=beta,
        gamma=gamma,
        rtol=rtol,
        atol=atol,
    )

    S = np.clip(sol_y[0] * N, 0.0, N)
    I = np.clip(sol_y[1] * N, 0.0, N)
    R = np.clip(sol_y[2] * N, 0.0, N)
    C = np.maximum.accumulate(sol_y[3] * N)

    delta_C = np.diff(C)
    expected_cases = np.clip(rho * delta_C, 0.0, None)
    beta_arr = np.full(days, beta, dtype=float)
    r_eff = (beta_arr * S[:-1]) / (gamma * N)

    return SIRResult(
        S=S,
        I=I,
        R=R,
        C=C,
        expected_cases=expected_cases,
        beta=beta_arr,
        r_eff=r_eff,
    )

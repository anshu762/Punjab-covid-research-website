"""Parametric bootstrap for parameter uncertainty and predictive forecast intervals."""
import logging
from dataclasses import dataclass
from typing import Any

import numpy as np

from app.models.fit import FitResultData, fit_m1, fit_m2
from app.models.sir import simulate_forward

logger = logging.getLogger("epilens.bootstrap")


@dataclass
class BootstrapResult:
    requested: int
    succeeded: int
    failed: int
    reliable: bool
    message: str | None
    draws: list[dict[str, Any]]
    failures: list[dict[str, Any]]
    fit_lower: np.ndarray | None  # length T
    fit_upper: np.ndarray | None  # length T
    forecast_lower: np.ndarray | None  # length 7
    forecast_upper: np.ndarray | None  # length 7


def run_parametric_bootstrap(
    fit: FitResultData,
    N: int,
    susceptible_fraction: float,
    gamma: float,
    rho: float,
    n_replicates: int = 200,
    bootstrap_starts: int = 1,
    seed: int = 42,
    forecast_horizon: int = 7,
) -> BootstrapResult:
    """Execute parametric bootstrap refits.

    Generates y*_d ~ NB(mu_hat_d, k_hat), refits warm-started from MLE.
    Predictive forecast intervals draw 10 NB observations per replicate per day.
    """
    mu_hat = fit.sir_result.expected_cases
    k_hat = (
        fit.parameters.get("dispersion")
        or fit.parameters.get("k", 50.0)
    )

    successful_draws: list[dict[str, Any]] = []

    failures: list[dict[str, Any]] = []
    fit_mu_replicates: list[np.ndarray] = []
    forecast_obs_samples: list[np.ndarray] = []  # will store (N_draws * 10, horizon)

    # Convert NB mean and dispersion to numpy negative binomial parameters
    # numpy.random.negative_binomial(n, p): mean = n*(1-p)/p.
    # Matching with mu and k: n = k, p = k / (k + mu).
    p_hat = np.clip(k_hat / (k_hat + np.maximum(mu_hat, 1e-9)), 1e-6, 1.0 - 1e-6)

    for b in range(1, n_replicates + 1):
        rng_b = np.random.default_rng(np.random.SeedSequence([abs(seed), b]))
        # Simulate synthetic observations
        y_synth = rng_b.negative_binomial(n=k_hat, p=p_hat).astype(float)

        try:
            if fit.model_type == "M1":
                b_fit = fit_m1(
                    y_observed=y_synth,
                    N=N,
                    susceptible_fraction=susceptible_fraction,
                    gamma=gamma,
                    rho=rho,
                    n_starts=bootstrap_starts,
                    seed=seed + b,
                    warm_start_params=fit.parameters,
                )
                final_beta = b_fit.parameters["beta"]
            else:
                c_idx = (
                    fit.change_point["dayIndex"]
                    if fit.change_point
                    else 28
                )
                b_fit = fit_m2(
                    y_observed=y_synth,
                    dates=[],
                    N=N,
                    susceptible_fraction=susceptible_fraction,
                    gamma=gamma,
                    rho=rho,
                    fixed_change_day=c_idx,
                    n_starts=bootstrap_starts,
                    seed=seed + b,
                    warm_start_params=fit.parameters,
                )
                final_beta = b_fit.parameters["beta2"]

            # Record fitted period expected cases
            fit_mu_replicates.append(b_fit.sir_result.expected_cases)

            # Forward simulation for predictive forecast
            end_state = {
                "S": float(b_fit.sir_result.S[-1]),
                "I": float(b_fit.sir_result.I[-1]),
                "R": float(b_fit.sir_result.R[-1]),
                "C": float(b_fit.sir_result.C[-1]),
            }
            fc_sim = simulate_forward(
                state=end_state,
                beta=final_beta,
                days=forecast_horizon,
                gamma=gamma,
                rho=rho,
                N=N,
            )
            fc_mu = fc_sim.expected_cases
            b_k = b_fit.parameters.get("dispersion", k_hat)
            fc_p = np.clip(b_k / (b_k + np.maximum(fc_mu, 1e-9)), 1e-6, 1.0 - 1e-6)

            # Draw 10 NB observations per forecast day
            for _ in range(10):
                obs_draw = rng_b.negative_binomial(n=b_k, p=fc_p).astype(float)
                forecast_obs_samples.append(obs_draw)

            successful_draws.append({
                "replicate": b,
                "ok": True,
                "parameters": b_fit.parameters,
                "finalState": end_state,
                "finalBeta": final_beta,
            })
        except Exception as exc:  # noqa: BLE001
            failures.append({
                "replicate": b,
                "reason": str(exc),
            })

    succeeded = len(successful_draws)
    failed = len(failures)
    reliable = succeeded >= 180

    msg = (
        None
        if reliable
        else f"Only {succeeded} of {n_replicates} refits succeeded — interpret intervals with caution"
    )

    if succeeded > 0:
        mu_matrix = np.vstack(fit_mu_replicates)
        fit_lower = np.percentile(mu_matrix, 2.5, axis=0)
        fit_upper = np.percentile(mu_matrix, 97.5, axis=0)

        fc_matrix = np.vstack(forecast_obs_samples)
        forecast_lower = np.percentile(fc_matrix, 2.5, axis=0)
        forecast_upper = np.percentile(fc_matrix, 97.5, axis=0)
    else:
        fit_lower = None
        fit_upper = None
        forecast_lower = None
        forecast_upper = None

    return BootstrapResult(
        requested=n_replicates,
        succeeded=succeeded,
        failed=failed,
        reliable=reliable,
        message=msg,
        draws=successful_draws,
        failures=failures,
        fit_lower=fit_lower,
        fit_upper=fit_upper,
        forecast_lower=forecast_lower,
        forecast_upper=forecast_upper,
    )

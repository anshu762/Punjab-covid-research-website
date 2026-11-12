"""Diagnostics: Pearson residuals, autocorrelation, parameter profiles, and status."""
import math
from typing import Any

import numpy as np
from scipy.optimize import minimize

from app.models.fit import FitResultData
from app.models.likelihood import PENALTY_NLL, compute_nll
from app.models.sir import integrate_sir


def compute_residuals_and_acf(
    y_observed: np.ndarray,
    mu_expected: np.ndarray,
    k: float,
    max_lag: int = 14,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], float]:
    """Compute raw residuals, Pearson residuals, and autocorrelation up to max_lag."""
    n = len(y_observed)
    raw = y_observed - mu_expected
    variance = mu_expected + (mu_expected ** 2) / max(k, 1e-6)
    pearson = raw / np.sqrt(np.maximum(variance, 1e-9))

    residuals_list = [
        {"raw": float(raw[i]), "pearson": float(pearson[i])}
        for i in range(n)
    ]

    # ACF calculation
    p_mean = float(np.mean(pearson))
    p_centered = pearson - p_mean
    c0 = float(np.sum(p_centered ** 2))

    acf_list = []
    limit = 1.96 / math.sqrt(n) if n > 0 else 0.0

    if c0 > 1e-12:
        for lag in range(1, min(max_lag + 1, n)):
            c_l = float(np.sum(p_centered[:-lag] * p_centered[lag:]))
            acf_val = c_l / c0
            acf_list.append({"lag": lag, "value": float(acf_val)})
    else:
        for lag in range(1, min(max_lag + 1, n)):
            acf_list.append({"lag": lag, "value": 0.0})

    return residuals_list, acf_list, float(limit)


def compute_parameter_profiles(
    fit: FitResultData,
    y_observed: np.ndarray,
    N: int,
    susceptible_fraction: float,
    gamma: float,
    rho: float,
    beta_bounds: tuple[float, float] = (0.01, 2.0),
    i0_bounds: tuple[float, float] = (1.0, 100000.0),
    dispersion_bounds: tuple[float, float] = (0.05, 1000.0),
    n_points: int = 15,
) -> dict[str, list[dict[str, float]]]:
    """Compute 15-point profile likelihoods for free parameters."""
    profiles: dict[str, list[dict[str, float]]] = {}
    T = len(y_observed)

    if fit.model_type == "M1":
        param_keys = ["beta", "i0", "dispersion"]
        mle = {
            "beta": fit.parameters["beta"],
            "i0": fit.parameters["i0"],
            "dispersion": fit.parameters["dispersion"],
        }
        bounds_map = {
            "beta": beta_bounds,
            "i0": i0_bounds,
            "dispersion": dispersion_bounds,
        }

        for p_name in param_keys:
            mle_val = mle[p_name]
            b_low, b_high = bounds_map[p_name]
            grid_min = max(b_low, mle_val * 0.5)
            grid_max = min(b_high, mle_val * 2.0)
            if grid_min >= grid_max:
                grid = np.array([mle_val])
            else:
                grid = np.geomspace(grid_min, grid_max, n_points)

            p_points = []
            other_names = [k for k in param_keys if k != p_name]
            other_bounds = [
                (math.log(bounds_map[on][0]), math.log(bounds_map[on][1]))
                for on in other_names
            ]
            x0 = [math.log(mle[on]) for on in other_names]

            def _make_obj(curr_p: str, curr_val: float, rem_names: list[str]):
                def _obj(theta: np.ndarray) -> float:
                    sub_vals = {curr_p: curr_val}
                    for idx, on in enumerate(rem_names):
                        sub_vals[on] = math.exp(theta[idx])
                    try:
                        sir_res = integrate_sir(
                            N=N,
                            susceptible_fraction=susceptible_fraction,
                            i0=sub_vals["i0"],
                            gamma=gamma,
                            rho=rho,
                            beta=sub_vals["beta"],
                            T=T,
                        )
                        return compute_nll(y_observed, sir_res.expected_cases, sub_vals["dispersion"])
                    except Exception:  # noqa: BLE001
                        return PENALTY_NLL
                return _obj

            for val in grid:
                fixed_val = float(val)
                obj_fn = _make_obj(p_name, fixed_val, other_names)
                try:
                    res = minimize(obj_fn, x0=x0, method="L-BFGS-B", bounds=other_bounds)
                    nll_val = float(res.fun) if res.success else PENALTY_NLL
                except Exception:  # noqa: BLE001
                    nll_val = PENALTY_NLL

                p_points.append({"value": fixed_val, "nll": nll_val})

            profiles[p_name] = p_points


    else:
        # M2
        param_keys = ["beta1", "beta2", "i0", "dispersion"]
        mle = {
            "beta1": fit.parameters["beta1"],
            "beta2": fit.parameters["beta2"],
            "i0": fit.parameters["i0"],
            "dispersion": fit.parameters["dispersion"],
        }
        bounds_map = {
            "beta1": beta_bounds,
            "beta2": beta_bounds,
            "i0": i0_bounds,
            "dispersion": dispersion_bounds,
        }
        c = fit.change_point["dayIndex"] if fit.change_point else 28

        for p_name in param_keys:
            mle_val = mle[p_name]
            b_low, b_high = bounds_map[p_name]
            grid_min = max(b_low, mle_val * 0.5)
            grid_max = min(b_high, mle_val * 2.0)
            if grid_min >= grid_max:
                grid = np.array([mle_val])
            else:
                grid = np.geomspace(grid_min, grid_max, n_points)

            p_points = []
            other_names = [k for k in param_keys if k != p_name]
            other_bounds = [
                (math.log(bounds_map[on][0]), math.log(bounds_map[on][1]))
                for on in other_names
            ]
            x0 = [math.log(mle[on]) for on in other_names]

            def _make_obj_m2(curr_p: str, curr_val: float, rem_names: list[str]):
                def _obj_m2(theta: np.ndarray) -> float:
                    sub_vals = {curr_p: curr_val}
                    for idx, on in enumerate(rem_names):
                        sub_vals[on] = math.exp(theta[idx])
                    try:
                        sir_res = integrate_sir(
                            N=N,
                            susceptible_fraction=susceptible_fraction,
                            i0=sub_vals["i0"],
                            gamma=gamma,
                            rho=rho,
                            beta=(sub_vals["beta1"], sub_vals["beta2"]),
                            T=T,
                            change_day=c,
                        )
                        return compute_nll(y_observed, sir_res.expected_cases, sub_vals["dispersion"])
                    except Exception:  # noqa: BLE001
                        return PENALTY_NLL
                return _obj_m2

            for val in grid:
                fixed_val = float(val)
                obj_fn = _make_obj_m2(p_name, fixed_val, other_names)
                try:
                    res = minimize(obj_fn, x0=x0, method="L-BFGS-B", bounds=other_bounds)
                    nll_val = float(res.fun) if res.success else PENALTY_NLL
                except Exception:  # noqa: BLE001
                    nll_val = PENALTY_NLL

                p_points.append({"value": fixed_val, "nll": nll_val})

            profiles[p_name] = p_points


    return profiles


def assess_diagnostics_status(
    convergence: dict[str, Any],
    boundary_hits: list[dict[str, Any]],
    acf_list: list[dict[str, Any]],
    acf_limit: float,
    bootstrap_reliable: bool | None = None,
) -> tuple[str, list[str]]:
    """Determine diagnostic status: 'ok', 'warnings', or 'problems'."""
    warnings: list[str] = []

    # Convergence check
    n_starts = convergence.get("nStarts", 20)
    n_converged = convergence.get("nConverged", 0)
    if n_converged < n_starts / 2:
        warnings.append(
            f"Low convergence: only {n_converged} of {n_starts} multi-start runs converged"
        )

    # Boundary hits
    for hit in boundary_hits:
        warnings.append(
            f"Parameter '{hit['param']}' hit the {hit['bound']} optimization boundary ({hit['value']:.4g})"
        )

    # Autocorrelation of residuals
    sig_acf_lags = [
        str(a["lag"]) for a in acf_list if abs(a["value"]) > acf_limit
    ]
    if sig_acf_lags:
        warnings.append(
            f"Residual autocorrelation exceeded 95% threshold at lags: {', '.join(sig_acf_lags)}"
        )

    # Bootstrap reliability
    if bootstrap_reliable is False:
        warnings.append("Bootstrap estimation was unreliable (< 180 successful refits)")

    if not warnings:
        status = "ok"
    elif len(warnings) <= 2 and not any(h["param"] in ("beta", "beta1", "beta2") for h in boundary_hits):
        status = "warnings"
    else:
        status = "problems"

    return status, warnings

"""Bounded multi-start fitting for SIR M1 and M2 models."""
import contextlib
import logging
import math
import zlib
from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy.optimize import OptimizeResult, minimize
from scipy.stats.qmc import LatinHypercube

from app.models.likelihood import PENALTY_NLL, compute_nll
from app.models.sir import SIRResult, integrate_sir

logger = logging.getLogger("epilens.fit")


class OptimizationFailed(Exception):
    """Raised when the optimization fails to find any valid solution."""

    def __init__(self, message: str, technical_details: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.technical_details = technical_details or message


@dataclass
class FitResultData:
    model_type: str  # "M1" | "M2"
    parameters: dict[str, float]
    convergence: dict[str, Any]
    boundary_hits: list[dict[str, Any]]
    change_point: dict[str, Any] | None
    sir_result: SIRResult


def _make_rng(seed: int, task_id: int | str) -> np.random.Generator:
    """Deterministic RNG derived from seed and task_id."""
    if isinstance(task_id, str):
        int_task = zlib.crc32(task_id.encode("utf-8"))
    else:
        int_task = int(task_id)
    seq = np.random.SeedSequence([abs(seed), abs(int_task)])
    return np.random.default_rng(seq)


def _check_boundary_hits(
    param_names: list[str],
    log_params: np.ndarray,
    log_bounds: list[tuple[float, float]],
) -> list[dict[str, Any]]:
    """Detect if any fitted parameter lies within 0.1% of its log-bounds."""
    hits: list[dict[str, Any]] = []
    for name, val, (low, high) in zip(param_names, log_params, log_bounds, strict=True):
        span = high - low
        if span <= 0:
            continue
        rel_from_low = (val - low) / span
        rel_from_high = (high - val) / span
        if rel_from_low <= 0.001:
            hits.append({"param": name, "bound": "lower", "value": float(math.exp(val))})
        elif rel_from_high <= 0.001:
            hits.append({"param": name, "bound": "upper", "value": float(math.exp(val))})
    return hits


def fit_m1(
    y_observed: np.ndarray,
    N: int,
    susceptible_fraction: float,
    gamma: float,
    rho: float,
    beta_bounds: tuple[float, float] = (0.01, 2.0),
    i0_bounds: tuple[float, float] = (1.0, 100000.0),
    dispersion_bounds: tuple[float, float] = (0.05, 1000.0),
    n_starts: int = 20,
    seed: int = 42,
    task_id: int | str = 0,
    rtol: float = 1e-8,
    atol: float = 1e-8,
    warm_start_params: dict[str, float] | None = None,
) -> FitResultData:
    """Fit constant transmission SIR (M1).

    Parameters: (beta, I0, k) optimized in log-space.
    """
    T = len(y_observed)
    if T < 7:
        raise OptimizationFailed(f"At least 7 days of observations required to fit M1, got {T}")

    param_names = ["beta", "i0", "dispersion"]
    log_bounds = [
        (math.log(beta_bounds[0]), math.log(beta_bounds[1])),
        (math.log(i0_bounds[0]), math.log(i0_bounds[1])),
        (math.log(dispersion_bounds[0]), math.log(dispersion_bounds[1])),
    ]

    def objective(theta: np.ndarray) -> float:
        beta_val = math.exp(theta[0])
        i0_val = math.exp(theta[1])
        k_val = math.exp(theta[2])
        try:
            sir_res = integrate_sir(
                N=N,
                susceptible_fraction=susceptible_fraction,
                i0=i0_val,
                gamma=gamma,
                rho=rho,
                beta=beta_val,
                T=T,
                rtol=rtol,
                atol=atol,
            )
            return compute_nll(y_observed, sir_res.expected_cases, k_val)
        except Exception:  # noqa: BLE001
            return PENALTY_NLL

    rng = _make_rng(seed, task_id)
    sampler = LatinHypercube(d=3, seed=rng)
    lhs_samples = sampler.random(n=n_starts)

    start_points = []
    for sample in lhs_samples:
        pt = [
            log_bounds[j][0] + sample[j] * (log_bounds[j][1] - log_bounds[j][0])
            for j in range(3)
        ]
        start_points.append(pt)

    warm_started = False
    if warm_start_params is not None and "beta" in warm_start_params:
        with contextlib.suppress(Exception):
            pt_warm = [
                math.log(warm_start_params["beta"]),
                math.log(warm_start_params["i0"]),
                math.log(warm_start_params["dispersion"]),
            ]
            # Clip into bounds
            pt_warm = [
                min(max(pt_warm[j], log_bounds[j][0]), log_bounds[j][1])
                for j in range(3)
            ]
            start_points[0] = pt_warm
            warm_started = True


    opt_results = []
    messages = []

    for pt in start_points:
        try:
            res = minimize(
                objective,
                x0=pt,
                method="L-BFGS-B",
                bounds=log_bounds,
                options={"ftol": 1e-9, "gtol": 1e-7, "maxiter": 1000},
            )
            opt_results.append(res)
            if res.message:
                messages.append(str(res.message))
        except Exception as exc:  # noqa: BLE001
            messages.append(f"Start failed: {exc}")

    converged = [r for r in opt_results if r.success and r.fun < PENALTY_NLL * 0.99]
    valid = [r for r in opt_results if math.isfinite(r.fun) and r.fun < PENALTY_NLL * 0.99]

    best_candidate = min(converged, key=lambda r: r.fun) if converged else (
        min(valid, key=lambda r: r.fun) if valid else None
    )

    if best_candidate is None:
        raise OptimizationFailed(
            "The optimiser could not find a valid fit. Try widening the β bounds, "
            "lowering the infectious duration, or changing the seed.",
            technical_details="All multi-start optimization trajectories terminated with non-finite NLL or penalty.",
        )

    best_theta = best_candidate.x
    best_beta = float(math.exp(best_theta[0]))
    best_i0 = float(math.exp(best_theta[1]))
    best_k = float(math.exp(best_theta[2]))

    sir_result = integrate_sir(
        N=N,
        susceptible_fraction=susceptible_fraction,
        i0=best_i0,
        gamma=gamma,
        rho=rho,
        beta=best_beta,
        T=T,
        rtol=rtol,
        atol=atol,
    )

    boundary_hits = _check_boundary_hits(param_names, best_theta, log_bounds)
    spread = (
        float(max(r.fun for r in converged) - min(r.fun for r in converged))
        if len(converged) > 1
        else 0.0
    )

    convergence = {
        "nStarts": n_starts,
        "nConverged": len(converged),
        "bestNll": float(best_candidate.fun),
        "nllSpread": spread,
        "messages": messages[:5],
        "n_starts_effective": n_starts,
        "warm_start": warm_started,
    }

    params = {
        "beta": best_beta,
        "i0": best_i0,
        "dispersion": best_k,
        "gamma": gamma,
        "reportingFraction": rho,
        "susceptibleFraction": susceptible_fraction,
    }

    return FitResultData(
        model_type="M1",
        parameters=params,
        convergence=convergence,
        boundary_hits=boundary_hits,
        change_point=None,
        sir_result=sir_result,
    )


def fit_m2(
    y_observed: np.ndarray,
    dates: list[str],
    N: int,
    susceptible_fraction: float,
    gamma: float,
    rho: float,
    beta_bounds: tuple[float, float] = (0.01, 2.0),
    i0_bounds: tuple[float, float] = (1.0, 100000.0),
    dispersion_bounds: tuple[float, float] = (0.05, 1000.0),
    cp_min_segment_days: int = 21,
    cp_step_days: int = 7,
    cp_search_starts: int = 5,
    n_starts: int = 20,
    seed: int = 42,
    task_id: int | str = 0,
    rtol: float = 1e-8,
    atol: float = 1e-8,
    fixed_change_day: int | None = None,
    warm_start_params: dict[str, float] | None = None,
) -> FitResultData:
    """Fit one change point SIR (M2).

    Parameters: (beta1, beta2, I0, k) + change_day.
    Candidate change days use training data only!
    """
    T = len(y_observed)
    if T < 42:
        raise OptimizationFailed(
            f"M2 model requires at least 42 selected days for change-point search, got {T}"
        )

    param_names = ["beta1", "beta2", "i0", "dispersion"]
    log_bounds = [
        (math.log(beta_bounds[0]), math.log(beta_bounds[1])),
        (math.log(beta_bounds[0]), math.log(beta_bounds[1])),
        (math.log(i0_bounds[0]), math.log(i0_bounds[1])),
        (math.log(dispersion_bounds[0]), math.log(dispersion_bounds[1])),
    ]

    def _fit_single_c(
        c: int,
        starts: int,
        sub_task_id: str,
        warm_params: dict[str, float] | None = None,
    ) -> tuple[OptimizeResult | None, list[str], int]:

        def objective(theta: np.ndarray) -> float:
            b1 = math.exp(theta[0])
            b2 = math.exp(theta[1])
            i0_val = math.exp(theta[2])
            k_val = math.exp(theta[3])
            try:
                res = integrate_sir(
                    N=N,
                    susceptible_fraction=susceptible_fraction,
                    i0=i0_val,
                    gamma=gamma,
                    rho=rho,
                    beta=(b1, b2),
                    T=T,
                    change_day=c,
                    rtol=rtol,
                    atol=atol,
                )
                return compute_nll(y_observed, res.expected_cases, k_val)
            except Exception:  # noqa: BLE001
                return PENALTY_NLL

        rng = _make_rng(seed, f"{task_id}_{sub_task_id}")
        sampler = LatinHypercube(d=4, seed=rng)
        samples = sampler.random(n=starts)

        pts = []
        for s in samples:
            pt = [
                log_bounds[j][0] + s[j] * (log_bounds[j][1] - log_bounds[j][0])
                for j in range(4)
            ]
            pts.append(pt)

        if warm_params is not None and "beta1" in warm_params:
            with contextlib.suppress(Exception):
                pt_w = [
                    math.log(warm_params.get("beta1", warm_params.get("beta", 0.3))),
                    math.log(warm_params.get("beta2", warm_params.get("beta", 0.3))),
                    math.log(warm_params["i0"]),
                    math.log(warm_params["dispersion"]),
                ]
                pt_w = [
                    min(max(pt_w[j], log_bounds[j][0]), log_bounds[j][1])
                    for j in range(4)
                ]
                pts[0] = pt_w


        results = []
        msgs = []
        for pt in pts:
            try:
                r = minimize(
                    objective,
                    x0=pt,
                    method="L-BFGS-B",
                    bounds=log_bounds,
                    options={"ftol": 1e-9, "gtol": 1e-7, "maxiter": 1000},
                )
                results.append(r)
                if r.message:
                    msgs.append(str(r.message))
            except Exception as e:  # noqa: BLE001
                msgs.append(str(e))

        conv = [r for r in results if r.success and r.fun < PENALTY_NLL * 0.99]
        valid = [r for r in results if math.isfinite(r.fun) and r.fun < PENALTY_NLL * 0.99]
        best = min(conv, key=lambda r: r.fun) if conv else (
            min(valid, key=lambda r: r.fun) if valid else None
        )
        return best, msgs, len(conv)

    if fixed_change_day is not None:
        best_c = fixed_change_day
        candidates_log: list[dict[str, Any]] = []
    else:
        # Candidate change days: c >= cp_min_segment_days and T - c >= cp_min_segment_days
        candidate_days = list(
            range(cp_min_segment_days, T - cp_min_segment_days + 1, cp_step_days)
        )
        if not candidate_days:
            raise OptimizationFailed("No candidate change days satisfy the segment requirements")

        candidates_log = []
        best_c = candidate_days[0]
        best_search_nll = float("inf")

        for c in candidate_days:
            r_c, _, _ = _fit_single_c(
                c=c,
                starts=cp_search_starts,
                sub_task_id=f"cp_search_{c}",
                warm_params=warm_start_params,
            )
            nll_val = float(r_c.fun) if r_c is not None else PENALTY_NLL
            candidates_log.append({
                "date": dates[c] if c < len(dates) else f"day_{c}",
                "dayIndex": c,
                "nll": nll_val,
            })
            if nll_val < best_search_nll:
                best_search_nll = nll_val
                best_c = c

    # Full multi-start refit of best candidate
    best_opt, final_msgs, n_conv = _fit_single_c(
        c=best_c,
        starts=n_starts,
        sub_task_id=f"final_{best_c}",
        warm_params=warm_start_params,
    )

    if best_opt is None:
        raise OptimizationFailed(
            "The optimiser could not find a valid fit for change-point model M2. "
            "Try widening the β bounds, lowering the infectious duration, or changing the seed.",
            technical_details=f"All multi-start runs for best change day {best_c} failed.",
        )

    best_theta = best_opt.x
    b1 = float(math.exp(best_theta[0]))
    b2 = float(math.exp(best_theta[1]))
    i0 = float(math.exp(best_theta[2]))
    k = float(math.exp(best_theta[3]))

    sir_result = integrate_sir(
        N=N,
        susceptible_fraction=susceptible_fraction,
        i0=i0,
        gamma=gamma,
        rho=rho,
        beta=(b1, b2),
        T=T,
        change_day=best_c,
        rtol=rtol,
        atol=atol,
    )

    boundary_hits = _check_boundary_hits(param_names, best_theta, log_bounds)

    convergence = {
        "nStarts": n_starts,
        "nConverged": n_conv,
        "bestNll": float(best_opt.fun),
        "nllSpread": 0.0,
        "messages": final_msgs[:5],
        "n_starts_effective": n_starts,
        "warm_start": warm_start_params is not None,
    }

    params = {
        "beta1": b1,
        "beta2": b2,
        "i0": i0,
        "dispersion": k,
        "gamma": gamma,
        "reportingFraction": rho,
        "susceptibleFraction": susceptible_fraction,
    }

    change_point_metadata = {
        "date": dates[best_c] if best_c < len(dates) else f"day_{best_c}",
        "dayIndex": best_c,
        "candidates": candidates_log,
        "note": "The change date represents a model change, not a verified policy event.",
    }

    return FitResultData(
        model_type="M2",
        parameters=params,
        convergence=convergence,
        boundary_hits=boundary_hits,
        change_point=change_point_metadata,
        sir_result=sir_result,
    )

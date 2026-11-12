"""Forward forecasting from fitted SIR models."""
import numpy as np

from app.models.fit import FitResultData
from app.models.sir import simulate_forward


def forecast_from_fit(
    fit: FitResultData,
    N: int,
    horizon: int = 7,
    rtol: float = 1e-8,
    atol: float = 1e-8,
) -> np.ndarray:
    """Simulate forward horizon days from the fitted end state using the final beta."""
    final_beta = (
        fit.parameters["beta2"]
        if fit.model_type == "M2"
        else fit.parameters["beta"]
    )
    gamma = fit.parameters["gamma"]
    rho = fit.parameters["reportingFraction"]

    end_state = {
        "S": float(fit.sir_result.S[-1]),
        "I": float(fit.sir_result.I[-1]),
        "R": float(fit.sir_result.R[-1]),
        "C": float(fit.sir_result.C[-1]),
    }

    forward_sim = simulate_forward(
        state=end_state,
        beta=final_beta,
        days=horizon,
        gamma=gamma,
        rho=rho,
        N=N,
        rtol=rtol,
        atol=atol,
    )

    return forward_sim.expected_cases

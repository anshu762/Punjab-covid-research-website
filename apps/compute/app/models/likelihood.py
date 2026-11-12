"""Negative binomial likelihood and negative log-likelihood (NLL) objective."""
import numpy as np
from scipy.special import gammaln

PENALTY_NLL = 1e12
EPSILON_MU = 1e-9


def nb_logpmf(y: np.ndarray | float, mu: np.ndarray | float, k: float) -> np.ndarray | float:
    """Compute negative binomial log PMF with mean mu and dispersion k.

    Var(y) = mu + mu^2 / k.
    Equivalent to scipy.stats.nbinom.logpmf(y, n=k, p=k/(k+mu)).
    """
    y_arr = np.asarray(y, dtype=float)
    mu_arr = np.maximum(np.asarray(mu, dtype=float), EPSILON_MU)
    k_val = max(float(k), 1e-6)

    term_gamma = gammaln(y_arr + k_val) - gammaln(k_val) - gammaln(y_arr + 1.0)
    term_k = k_val * (np.log(k_val) - np.log(k_val + mu_arr))
    # Where y == 0, y * log(...) is 0 without evaluating log(0)
    with np.errstate(divide="ignore", invalid="ignore"):
        term_y = np.where(
            y_arr > 0,
            y_arr * (np.log(mu_arr) - np.log(k_val + mu_arr)),
            0.0,
        )

    log_prob = term_gamma + term_k + term_y
    if np.isscalar(y) and np.isscalar(mu):
        return float(log_prob)
    return log_prob


def compute_nll(y_observed: np.ndarray, mu_expected: np.ndarray, k: float) -> float:
    """Compute negative log-likelihood across observations.

    Returns PENALTY_NLL if mu is non-finite or contains negative values.
    """
    if len(y_observed) != len(mu_expected):
        return PENALTY_NLL

    if not np.all(np.isfinite(mu_expected)) or not np.isfinite(k) or k <= 0:
        return PENALTY_NLL

    if np.any(mu_expected < 0):
        return PENALTY_NLL

    log_probs = nb_logpmf(y_observed, mu_expected, k)
    if not np.all(np.isfinite(log_probs)):
        return PENALTY_NLL

    nll = -float(np.sum(log_probs))
    if not np.isfinite(nll) or np.isnan(nll):
        return PENALTY_NLL

    return nll

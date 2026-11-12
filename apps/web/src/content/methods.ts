import {
  APP_NAME,
  REGION,
  DEFAULT_DATE_RANGE,
  LIMITS,
  MODEL_DEFAULTS,
  EVAL_PROTOCOL,
  METHODS_SOURCE_URL,
  DEFAULT_POPULATION_PROVENANCE,
  CLEANING_RULES,
  EVALUATION_RULES,
  BOOTSTRAP_RULES,
  SENSITIVITY_GRID,
  OPTIMIZATION_SHORTCUTS,
} from "@epilens/shared";

export interface MethodSection {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  latexEquations?: { label: string; latex: string; plainText: string }[];
  content: string[];
}

export const METHOD_SECTIONS: MethodSection[] = [
  {
    id: "purpose",
    title: "1. Purpose and Scope",
    shortTitle: "Purpose & Scope",
    summary: `Methodological workbench for evaluating epidemiological models on Punjab COVID-19 data.`,
    content: [
      `${APP_NAME} is a private research website engineered to inspect COVID-19 surveillance data for ${REGION.name} (state code: ${REGION.code}), fit continuous-time Susceptible-Infectious-Removed (SIR) compartmental models, benchmark forecast accuracy against simple statistical baselines, evaluate hypothetical transmission scenarios, and export fully reproducible artifacts.`,
      `The platform emphasizes scientific transparency: observed reported cases are strictly distinguished from simulated latent infections, and every metric is traceable to an immutable database run ID. ${APP_NAME} does not provide clinical, diagnostic, or public health policy advice.`,
    ],
  },
  {
    id: "data",
    title: "2. Data Provenance",
    shortTitle: "Data Provenance",
    summary: `Documented historical surveillance archives and population baselines.`,
    content: [
      `Historical epidemiological surveillance records for Punjab are derived from the publicly documented COVID-19 India historical archive at ${METHODS_SOURCE_URL}. This dataset represents a revised, frozen archive of state bulletin counts spanning the 2020 pandemic waves.`,
      `The default analysis window covers ${DEFAULT_DATE_RANGE.start} to ${DEFAULT_DATE_RANGE.end} (inclusive). A synthetic demo dataset is also bundled for offline and illustrative testing, prominently labeled "Demo data" across the user interface.`,
      `Population baseline for Punjab is anchored at ${DEFAULT_POPULATION_PROVENANCE.value.toLocaleString("en-IN")} persons (geography: ${DEFAULT_POPULATION_PROVENANCE.geography}, reference year: ${DEFAULT_POPULATION_PROVENANCE.year}, source: ${DEFAULT_POPULATION_PROVENANCE.sourceUrl}). Empirical fitting is strictly blocked unless valid population provenance is established.`,
    ],
  },
  {
    id: "cleaning",
    title: "3. Data Cleaning Rules",
    shortTitle: "Data Cleaning",
    summary: `Heuristics for handling missing entries, duplicate dates, and retrospective corrections.`,
    content: [
      `Surveillance time series undergo automated server-side verification before analysis (upload limits: max ${LIMITS.uploadMaxBytes / (1024 * 1024)} MB, up to ${LIMITS.uploadMaxRows.toLocaleString()} rows):`,
      `• Blanks as Missing: Blank or non-numeric entries are treated as missing values, never silently converted to zero.`,
      `• Duplicate Keys & Calendar Gaps: Duplicate dates or missing calendar days within the selected analysis window block model fitting until resolved.`,
      `• Negative Correction Algorithm: When public health authorities retrospectively subtract reported counts (negative deltas), the correction magnitude is subtracted from preceding positive counts within a ${CLEANING_RULES.negativeCorrectionWindowDays}-day lookback window, starting with the most recent preceding day. The count on the correction day itself is set to zero. Every adjustment is immutably logged with date, raw value, analysis value, and delta. If preceding positive counts are insufficient within the ${CLEANING_RULES.negativeCorrectionWindowDays}-day window, the record is flagged UNRESOLVED_CORRECTION and blocks model fitting.`,
      `• Prefix Isolation: When running expanding-window forecast evaluations, each training prefix is normalized independently to prevent information leakage from future revisions into historical fits.`,
    ],
  },
  {
    id: "model",
    title: "4. Model Equations and Observation Mapping",
    shortTitle: "Model Equations",
    summary: `Continuous-time Kermack–McKendrick ODEs with cumulative incidence tracking.`,
    latexEquations: [
      {
        label: "SIR Compartmental Differential Equations",
        latex: `\\begin{aligned}
\\frac{dS}{dt} &= -\\frac{\\beta(t) S(t) I(t)}{N} \\\\[6pt]
\\frac{dI}{dt} &= \\frac{\\beta(t) S(t) I(t)}{N} - \\gamma I(t) \\\\[6pt]
\\frac{dR}{dt} &= \\gamma I(t) \\\\[6pt]
\\frac{dC}{dt} &= \\frac{\\beta(t) S(t) I(t)}{N}, \\quad C(0) = 0
\\end{aligned}`,
        plainText: "dS/dt = -beta(t)*S*I/N; dI/dt = beta(t)*S*I/N - gamma*I; dR/dt = gamma*I; dC/dt = beta(t)*S*I/N, C(0)=0",
      },
      {
        label: "Observation Mapping and Effective Reproduction Number",
        latex: `\\begin{aligned}
\\mu_d &= \\rho \\cdot \\left[ C(t_{d+1}) - C(t_d) \\right] \\\\[6pt]
R_{\\text{eff}}(t) &= \\frac{\\beta(t) S(t)}{\\gamma N}
\\end{aligned}`,
        plainText: "mu_d = rho * [C(t_{d+1}) - C(t_d)]; R_eff(t) = beta(t)*S(t)/(gamma*N)",
      },
    ],
    content: [
      `The core dynamical engine integrates a continuous-time Kermack–McKendrick compartmental model with an auxiliary cumulative infections tracker C(t). Compartments represent counts of individuals in Susceptible (S), Infectious (I), and Removed (R) states.`,
      `Initial conditions are defined by S(0) = susceptible_fraction * N, I(0) = I_initial, and R(0) = N - S(0) - I(0).`,
      `Expected daily reported incidence mu_d is mapped from model infections by multiplying the daily increment in C(t) by the assumed reporting fraction rho. Observed new confirmed cases are fitted directly to mu_d, never to latent prevalence I(t).`,
      `The effective reproduction ratio R_eff(t) reflects transmission potential given current susceptibility. Note: the ratio beta/gamma is an assumption-dependent model ratio, heavily influenced by the fixed infectious duration assumption.`,
      `Report-Date Approximation: The primary model directly fits daily reported incidence without an explicit parameterization for incubation or administrative reporting delays. This approximation assumes reporting latency remains approximately stationary across the analysis horizon.`,
    ],
  },
  {
    id: "parameters",
    title: "5. Parameter Definitions",
    shortTitle: "Parameters",
    summary: `Epidemiological variables, allowable ranges, and estimation classifications.`,
    content: [
      `Parameters are classified into fixed provenance constants, user-selected assumptions, and numerically estimated parameters:`,
      `• beta: Daily transmission rate per day. Fitted. Search bounds: [${MODEL_DEFAULTS.betaBounds[0]}, ${MODEL_DEFAULTS.betaBounds[1]}].`,
      `• gamma: Daily removal rate (gamma = 1/D per day). Fixed assumption per run, derived from infectious duration D. Allowed D: 3 to 21 days (default ${MODEL_DEFAULTS.infectiousDurationDays} days).`,
      `• rho: Ascertainment / reporting fraction. Fixed assumption per run. Allowed range: 0.01 to 1.00 (default ${MODEL_DEFAULTS.reportingFraction}). Reflects the assumed fraction of true infections captured in surveillance.`,
      `• f_s: Initially susceptible population fraction. Fixed assumption per run. Allowed range: 0.01 to 0.999 (default ${MODEL_DEFAULTS.susceptibleFraction}).`,
      `• I_initial: Latent infectious individuals at t=0. Fitted. Search bounds: [1, min(${MODEL_DEFAULTS.maxInitialInfectious.toLocaleString()}, N - S_initial)].`,
      `• k: Negative binomial overdispersion parameter. Fitted in log-space. Search bounds: [${MODEL_DEFAULTS.dispersionBounds[0]}, ${MODEL_DEFAULTS.dispersionBounds[1]}].`,
      `• tau: Structural change-point date (Model M2 only). Fitted via discrete grid search over valid 7-day training intervals.`,
    ],
  },
  {
    id: "fitting",
    title: "6. Likelihood and Optimization",
    shortTitle: "Likelihood & Fitting",
    summary: `Negative binomial likelihood, ODE integration, and multi-start solver settings.`,
    latexEquations: [
      {
        label: "Negative Binomial Likelihood Formulation",
        latex: `\\log L(\\theta) = \\sum_{d=1}^T \\left[ \\log \\Gamma(y_d + k) - \\log \\Gamma(k) - \\log(y_d!) + k \\log\\left(\\frac{k}{\\mu_d + k}\\right) + y_d \\log\\left(\\frac{\\mu_d}{\\mu_d + k}\\right) \\right]`,
        plainText: "log L(theta) = sum [ log Gamma(y_d + k) - log Gamma(k) - log(y_d!) + k*log(k/(mu_d+k)) + y_d*log(mu_d/(mu_d+k)) ]",
      },
    ],
    content: [
      `The observation model assumes daily reported counts y_d follow a negative binomial distribution with mean mu_d and variance mu_d + (mu_d^2)/k. As k approaches infinity, the model converges to Poisson counting noise; finite k accounts for surveillance overdispersion.`,
      `Parameters are estimated using bounded L-BFGS-B optimization over log-transformed parameters (log beta, log I_initial, log k) to guarantee strict non-negativity and numerical stability. Latin Hypercube sampling with a fixed pseudo-random seed (default ${MODEL_DEFAULTS.seed}) seeds ${MODEL_DEFAULTS.nStarts} starting points per estimation task.`,
      `ODEs are integrated in normalized state space (scaled by N) using SciPy's solve_ivp with adaptive tolerances rtol=${MODEL_DEFAULTS.rtol} and atol=${MODEL_DEFAULTS.atol}.`,
      `Optimization Shortcuts Disclosed: To maintain responsive runtimes and stay within free-tier serverless execution limits, the compute engine utilizes warm-start parameter initialization from preceding origins during rolling evaluations, and uses ${OPTIMIZATION_SHORTCUTS.sensitivityReducedStarts} multi-start seeds (instead of ${OPTIMIZATION_SHORTCUTS.primaryStarts}) when running the 27-combination sensitivity matrix. Boundary hits and convergence metrics are immutably recorded in the fit payload.`,
    ],
  },
  {
    id: "changepoint",
    title: "7. One Change-Point Model (M2)",
    shortTitle: "Change-Point SIR",
    summary: `Piecewise transmission dynamics and training-restricted candidate grid search.`,
    latexEquations: [
      {
        label: "Piecewise Transmission Function",
        latex: `\\beta(t) = \\begin{cases} \\beta_1, & t < \\tau \\\\[4pt] \\beta_2, & t \\ge \\tau \\end{cases}`,
        plainText: "beta(t) = beta_1 for t < tau, beta_2 for t >= tau",
      },
    ],
    content: [
      `Model M2 introduces a single structural break date tau, dividing the observation period into two transmission regimes: beta_1 before tau, and beta_2 from tau onward.`,
      `Change-point candidate dates are evaluated strictly at 7-day intervals, constrained to have at least 21 days of training observations before and after candidate tau. Crucially, tau is searched using training data only, preventing forward leakage.`,
      `Scientific Caution: The fitted break date tau represents a mathematical model change that improves fit quality; it must NOT be interpreted as a verified policy event or causal intervention date without independent epidemiological corroboration.`,
    ],
  },
  {
    id: "evaluation",
    title: "8. Forecast Evaluation Protocol",
    shortTitle: "Forecast Evaluation",
    summary: `13 expanding origins, competitive baselines, and frozen model selection rules.`,
    content: [
      `Forecast capability is evaluated using an expanding chronological window across ${EVAL_PROTOCOL.defaultBlocks} weekly origins starting on ${EVAL_PROTOCOL.firstOrigin} (origins spaced by ${EVAL_PROTOCOL.originStepDays} days).`,
      `The first ${EVAL_PROTOCOL.developmentBlocks} origins form the development block set; the final ${EVAL_PROTOCOL.finalBlocks} origins constitute the held-out validation set. Forecast horizon is fixed at 7 days ahead.`,
      `Competing Baselines:`,
      `1. 7-Day Trailing Mean: Projects the mean of the last 7 observed training days as a constant forecast for all 7 forward days.`,
      `2. Same-Weekday Repetition: Repeats the daily pattern of the preceding 7 days, capturing weekly day-of-week reporting fluctuations.`,
      `Frozen Selection Rules:`,
      `• Model Selection: Model M2 is preferred over Model M1 only if M2 improves development Mean Absolute Error (MAE) by at least ${EVALUATION_RULES.m2ImprovementThresholdPct}% AND achieves lower MAE in at least ${EVALUATION_RULES.m2MinBlocksWonDev} of the ${EVALUATION_RULES.devBlocksTotal} development blocks. Otherwise, M1 is retained.`,
      `• Benchmark Selection: The better-performing baseline is determined by minimum development MAE.`,
      `• Final Validation Verdict: Final forecast improvement is supported only if the selected SIR model beats the selected baseline by at least ${EVALUATION_RULES.finalImprovementThresholdPct}% final MAE AND wins at least ${EVALUATION_RULES.finalBlocksWonRequired} of the ${EVALUATION_RULES.finalBlocksTotal} final blocks. Otherwise, the verdict states "Improvement not demonstrated".`,
      `Notice: These criteria are explicit project rules designed to prevent retrospective model cherry-picking, not statistical significance tests. Validation is conducted on a revised historical archive.`,
    ],
  },
  {
    id: "uncertainty",
    title: "9. Uncertainty and Parametric Bootstrap",
    shortTitle: "Uncertainty",
    summary: `Parametric bootstrap simulations, reliability thresholds, and interval types.`,
    content: [
      `Uncertainty quantification executes a parametric bootstrap with ${BOOTSTRAP_RULES.totalReplicates} replicates. For each replicate, synthetic daily incidence time series are sampled from the fitted negative binomial observation model and refitted using identical optimizer settings.`,
      `Reliability Threshold: At least ${BOOTSTRAP_RULES.minReliableSuccessfulReplicates} of the ${BOOTSTRAP_RULES.totalReplicates} bootstrap replicates (${(BOOTSTRAP_RULES.minReliableSuccessfulReplicates / BOOTSTRAP_RULES.totalReplicates) * 100}%) must converge successfully for intervals to be classified as reliable. If fewer than ${BOOTSTRAP_RULES.minReliableSuccessfulReplicates} replicates converge, an amber warning badge is displayed.`,
      `Interval Types:`,
      `• Parameter Intervals: Empirical 2.5% to 97.5% quantiles of fitted parameters across converged bootstrap refits, reflecting parameter estimation uncertainty.`,
      `• Predictive Intervals: 95% forecast bands that include observation noise (negative binomial dispersion), reflecting expected variation in reported counts.`,
      `All intervals are conditional on model assumptions (D, rho, f_s) and do not account for structural model misspecification.`,
    ],
  },
  {
    id: "scenarios",
    title: "10. Scenario Explorer",
    shortTitle: "Scenarios",
    summary: `Hypothetical forward policy projections and paired bootstrap propagation.`,
    content: [
      `The Scenario Explorer simulates forward trajectories starting on the day immediately following the fitted analysis period (T_last + 1) for a horizon of 7 to 60 days (default ${MODEL_DEFAULTS.scenario.horizonDays} days).`,
      `Baseline and scenario simulations launch from identical starting latent states S(T_last), I(T_last), and R(T_last). Baseline transmission uses the final fitted beta; scenario transmission applies a user-selected change from ${MODEL_DEFAULTS.scenario.minPercent}% to +${MODEL_DEFAULTS.scenario.maxPercent}% (step ${MODEL_DEFAULTS.scenario.stepPercent}%).`,
      `Paired Bootstrap: When the parent run includes bootstrap draws, each converged replicate b is simulated through both baseline and scenario branches using the identical replicate starting state and draw-specific beta_b.`,
      `Plain-Language Constraints: Output summaries follow a deterministic template. Outputs are strictly labeled "Hypothetical simulation under the fitted model" and never use causal claims such as "lives saved", "policy impact", "proven effect", or "real-world cases prevented".`,
    ],
  },
  {
    id: "sensitivity",
    title: "11. Parameter Sensitivity Analysis",
    shortTitle: "Sensitivity",
    summary: `Systematic 27-combination evaluation across assumptions grid.`,
    content: [
      `EpiLens systematically probes the stability of model conclusions across a full factorial grid of ${SENSITIVITY_GRID.totalCombinations} parameter combinations:`,
      `• Infectious duration D in {${SENSITIVITY_GRID.durations.join(", ")}} days (gamma = 1/D per day)`,
      `• Reporting fraction rho in {${SENSITIVITY_GRID.reportingFractions.map(r => r.toFixed(2)).join(", ")}}`,
      `• Initially susceptible fraction f_s in {${SENSITIVITY_GRID.susceptibleFractions.map(s => s.toFixed(2)).join(", ")}}`,
      `Every combination is evaluated independently, reporting forecast MAE, RMSE, and ranking reversals against the primary selected baseline. Rather than presenting a single cherry-picked set of assumptions, the full matrix is tabulated and downloadable as CSV.`,
    ],
  },
  {
    id: "reproducibility",
    title: "12. Reproducibility Standards",
    shortTitle: "Reproducibility",
    summary: `Immutable run identifiers, cryptographic checksums, and export bundles.`,
    content: [
      `Every execution creates an immutable database record with a unique UUID run ID, random seed, Git code revision hash, and dataset SHA-256 checksum.`,
      `The Download Centre produces a complete Reproducibility ZIP Bundle containing:`,
      `• manifest.json: Per-file SHA-256 cryptographic checksums, runtime metadata, and system environment info.`,
      `• config.json: Full deserializable run configuration.`,
      `• provenance.json: Dataset provenance, population baseline citations, and retrieval timestamps.`,
      `• Cleaned observations and anomaly logs as CSV with spreadsheet formula injection protection.`,
      `• 300 DPI high-resolution figures in PNG and vector SVG format with complete figure captions.`,
      `All exported text cells are sanitized to neutralize formula triggers ('=', '+', '-', '@', '\\t', '\\r'). Server file paths and session secrets are strictly audited and excluded from export archives.`,
    ],
  },
  {
    id: "limitations",
    title: "13. Scientific Limitations",
    shortTitle: "Limitations",
    summary: `Epidemiological caveats, structural assumptions, and non-clinical disclaimer.`,
    content: [
      `Users and researchers must interpret EpiLens results in light of critical scientific limitations:`,
      `• Surveillance Artifacts: Surveillance counts reflect testing policy, healthcare seeking behavior, and administrative backlogs, not true infection incidence.`,
      `• Assumed Parameters: The reporting fraction rho and initial susceptibility f_s are fixed assumptions, not biologically estimated quantities. Results are conditional on these values.`,
      `• Homogeneous Mixing: Classical SIR assumes a well-mixed population without age structure, socio-demographic stratification, or spatial contact networks.`,
      `• Immunity Dynamics: The model does not include waning immunity, pathogen reinfection, or vaccination rollouts (which commenced in early 2021).`,
      `• Revised Data Archive: Validation is performed retrospectively on a finalized surveillance archive rather than in real-time prospective conditions.`,
      `• Non-Clinical Notice: EpiLens is a research tool for modeling methodology evaluation. It does not provide medical, diagnostic, or public health policy guidance.`,
    ],
  },
  {
    id: "ai",
    title: "14. AI Plain-Language Explainer",
    shortTitle: "AI Explainer",
    summary: `Strictly grounded numerical explanations and safety guardrails.`,
    content: [
      `The optional AI Explainer provides plain-language summaries of complex epidemiological outputs powered by OpenRouter LLM endpoints.`,
      `Guardrails & Grounding:`,
      `• Strict Numerical Grounding: Every numeric value in an AI-generated explanation is verified via regex against stored database payloads. Ungrounded numbers trigger an automatic warning banner.`,
      `• Anti-Hallucination Prompting: The AI is strictly instructed to restate stored numbers, describe model mechanisms, and state whether performance thresholds were met. It is forbidden from speculating on real-world policy impact or asserting causal efficacy.`,
      `• Deterministic Fallbacks: If AI services are unconfigured or unavailable, the system produces deterministic template summaries without loss of functionality.`,
    ],
  },
];

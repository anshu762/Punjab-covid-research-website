# DB_TABLES.md — Database Tables and Columns Reference

This document defines the exact database table and column names used across EpiLens.
Both Prisma (`schema.prisma`) and Python backend SQL (`apps/compute`) must match this specification identically.

All table names are **plural snake_case** (`@@map`).
All column names are **snake_case** (`@map`).

---

## 1. `users`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `name` | `VARCHAR` | Nullable |
| `email` | `VARCHAR` | Unique, Nullable |
| `email_verified` | `TIMESTAMPTZ` | Nullable |
| `password_hash` | `VARCHAR` | Nullable (bcrypt hash for email/password users) |
| `image` | `VARCHAR` | Nullable |
| `is_demo` | `BOOLEAN` | Default `false` |
| `demo_expires_at` | `TIMESTAMPTZ` | Nullable (used for 24h cleanup) |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |

## 2. `accounts`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `user_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `type` | `VARCHAR` | |
| `provider` | `VARCHAR` | |
| `provider_account_id` | `VARCHAR` | |
| `refresh_token` | `TEXT` | Nullable |
| `access_token` | `TEXT` | Nullable |
| `expires_at` | `INTEGER` | Nullable |
| `token_type` | `VARCHAR` | Nullable |
| `scope` | `VARCHAR` | Nullable |
| `id_token` | `TEXT` | Nullable |
| `session_state` | `VARCHAR` | Nullable |
| *Indexes* | | `UNIQUE(provider, provider_account_id)` |

## 3. `sessions`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `session_token` | `VARCHAR` | Unique |
| `user_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `expires` | `TIMESTAMPTZ` | |

## 4. `verification_tokens`
| Column | Type | Constraints / Description |
|---|---|---|
| `identifier` | `VARCHAR` | |
| `token` | `VARCHAR` | Unique |
| `expires` | `TIMESTAMPTZ` | |
| *Key* | | `PRIMARY KEY(identifier, token)` |

## 5. `datasets`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `owner_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `family_id` | `VARCHAR` | Family grouping identifier |
| `version` | `INTEGER` | Sequential version number |
| `name` | `VARCHAR` | Display name |
| `region_code` | `VARCHAR` | Default `'PB'` |
| `is_synthetic` | `BOOLEAN` | Default `false` |
| `source_kind` | `VARCHAR` | `'ARCHIVE'` \| `'UPLOAD'` \| `'SYNTHETIC'` |
| `source_name` | `VARCHAR` | Source identifier |
| `source_url` | `VARCHAR` | Nullable |
| `retrieved_at` | `TIMESTAMPTZ` | Snapshot timestamp |
| `sha256` | `VARCHAR` | Checksum of source data |
| `status` | `VARCHAR` | Enum `PENDING_MAPPING` \| `READY` \| `BLOCKED` |
| `raw_file_id` | `VARCHAR` | Nullable |
| `clean_file_id` | `VARCHAR` | Nullable |
| `quality_log_file_id` | `VARCHAR` | Nullable |
| `schema_mapping` | `JSONB` | Nullable |
| `quality_summary` | `JSONB` | Nullable |
| `population_value` | `INTEGER` | Provenance population count |
| `population_source_url`| `VARCHAR` | Nullable |
| `population_reference_year`| `INTEGER`| Nullable |
| `population_geography` | `VARCHAR` | Nullable |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |
| `updated_at` | `TIMESTAMPTZ` | |
| *Indexes* | | `UNIQUE(owner_id, family_id, version)`, `INDEX(owner_id, created_at)` |

## 6. `observations`
| Column | Type | Constraints / Description |
|---|---|---|
| `dataset_id` | `VARCHAR` | Foreign Key -> `datasets.id` ON DELETE CASCADE |
| `date` | `DATE` | Observation date (UTC) |
| `new_confirmed_raw` | `INTEGER` | Raw daily count (nullable) |
| `new_confirmed_analysis`| `INTEGER`| Cleaned daily count for analysis (nullable) |
| `quality_flag` | `VARCHAR` | Enum `OK` \| `MISSING` \| `DUPLICATE` \| `CORRECTED` \| `CORRECTION_DAY` \| `UNRESOLVED_CORRECTION` |
| `transformation_id` | `VARCHAR` | Audit tracking ID |
| `source_ref` | `VARCHAR` | Original row/line reference |
| *Key* | | `PRIMARY KEY(dataset_id, date)` |

## 7. `stored_files`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `owner_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `dataset_id` | `VARCHAR` | Foreign Key -> `datasets.id` ON DELETE CASCADE (nullable) |
| `run_id` | `VARCHAR` | Foreign Key -> `runs.id` ON DELETE CASCADE (nullable) |
| `kind` | `VARCHAR` | Enum `RAW_UPLOAD` \| `CLEAN_CSV` \| `QUALITY_LOG` \| `EXPORT` |
| `filename` | `VARCHAR` | Stored file name |
| `mime_type` | `VARCHAR` | MIME type |
| `size_bytes` | `INTEGER` | File size |
| `sha256` | `VARCHAR` | Payload hash |
| `content` | `BYTEA` | Binary file payload |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |

## 8. `runs`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `owner_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `dataset_id` | `VARCHAR` | Foreign Key -> `datasets.id` ON DELETE RESTRICT |
| `display_name` | `VARCHAR` | Editable display label |
| `mode` | `VARCHAR` | Enum `FIT` \| `EVALUATE` |
| `model_type` | `VARCHAR` | Enum `M1` \| `M2` |
| `config` | `JSONB` | Run configuration payload |
| `config_hash` | `VARCHAR` | Deterministic configuration hash |
| `cache_key` | `VARCHAR` | Cache indexing key |
| `status` | `VARCHAR` | Enum `QUEUED` \| `VALIDATING` \| `FITTING` \| `EVALUATING` \| `ESTIMATING_UNCERTAINTY` \| `EXPORTING` \| `COMPLETED` \| `FAILED` \| `CANCELLED` |
| `stage` | `VARCHAR` | Current stage name |
| `progress_done` | `INTEGER` | Progress numerator |
| `progress_total` | `INTEGER` | Progress denominator |
| `cancel_requested` | `BOOLEAN` | Default `false` |
| `idempotency_key` | `VARCHAR` | Nullable, unique per owner |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |
| `started_at` | `TIMESTAMPTZ` | Nullable |
| `completed_at` | `TIMESTAMPTZ` | Nullable |
| `code_version` | `VARCHAR` | Git SHA / version string |
| `seed` | `INTEGER` | Deterministic random seed |
| `error_reference` | `VARCHAR` | Nullable |
| `error_message` | `VARCHAR` | Nullable |
| `has_fit` | `BOOLEAN` | Default `false` |
| `evaluated` | `BOOLEAN` | Default `false` |
| *Indexes* | | `UNIQUE(owner_id, idempotency_key)`, `INDEX(owner_id, created_at)`, `INDEX(owner_id, cache_key)` |

## 9. `fit_results`
| Column | Type | Constraints / Description |
|---|---|---|
| `run_id` | `VARCHAR` | Primary Key, Foreign Key -> `runs.id` ON DELETE CASCADE |
| `parameters` | `JSONB` | Fitted parameter values |
| `parameter_intervals` | `JSONB` | Bootstrap confidence intervals |
| `assumptions` | `JSONB` | Inherent fixed assumptions |
| `convergence` | `JSONB` | Optimization convergence stats |
| `boundary_hits` | `JSONB` | Optimization boundary flags |
| `change_point` | `JSONB` | Nullable (for M2) |
| `payload` | `JSONB` | Additional fitted trajectory arrays |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |

## 10. `forecast_rows`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `SERIAL` | Primary Key |
| `run_id` | `VARCHAR` | Foreign Key -> `runs.id` ON DELETE CASCADE |
| `model` | `VARCHAR` | Model identifier (`'M1'`, `'M2'`, `'baseline_mean'`, `'baseline_weekday'`) |
| `origin_date` | `DATE` | Evaluation origin cutoff date |
| `target_date` | `DATE` | 1..7 day forward forecast date |
| `split` | `VARCHAR` | `'development'` \| `'final'` |
| `estimate` | `DOUBLE PRECISION` | Model point forecast |
| `lower` | `DOUBLE PRECISION` | Lower bound (nullable) |
| `upper` | `DOUBLE PRECISION` | Upper bound (nullable) |
| `interval_unavailable_reason`| `VARCHAR` | Reason string if interval is null |
| `actual` | `DOUBLE PRECISION` | Realized observation count |
| *Indexes* | | `INDEX(run_id, model, origin_date)` |

## 11. `scenarios`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `owner_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `parent_run_id` | `VARCHAR` | Foreign Key -> `runs.id` ON DELETE CASCADE |
| `percent_change` | `INTEGER` | Transmission delta (-50% to +50%) |
| `horizon_days` | `INTEGER` | Projection horizon (7 to 60) |
| `status` | `VARCHAR` | Enum `QUEUED` \| `RUNNING` \| `COMPLETED` \| `FAILED` \| `CANCELLED` |
| `config` | `JSONB` | Scenario config |
| `daily_outputs` | `JSONB` | Daily simulated outcomes |
| `summary` | `JSONB` | Summary impact metrics |
| `error_reference` | `VARCHAR` | Nullable |
| `error_message` | `VARCHAR` | Nullable |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |
| `completed_at` | `TIMESTAMPTZ` | Nullable |

## 12. `exports`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `owner_id` | `VARCHAR` | Foreign Key -> `users.id` ON DELETE CASCADE |
| `run_id` | `VARCHAR` | Foreign Key -> `runs.id` ON DELETE CASCADE |
| `scenario_id` | `VARCHAR` | Nullable |
| `type` | `VARCHAR` | Export format type |
| `status` | `VARCHAR` | Enum `QUEUED` \| `RUNNING` \| `READY` \| `FAILED` |
| `file_id` | `VARCHAR` | Stored file reference (nullable) |
| `checksum` | `VARCHAR` | Checksum of bundle |
| `manifest` | `JSONB` | Provenance manifest |
| `error_reference` | `VARCHAR` | Nullable |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |
| `expires_at` | `TIMESTAMPTZ` | Expiry for authorized download |

## 13. `jobs`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `VARCHAR` | Primary Key (cuid) |
| `type` | `VARCHAR` | Enum `RUN` \| `SCENARIO` \| `SENSITIVITY` \| `EXPORT` \| `SELFTEST` |
| `ref_id` | `VARCHAR` | Target record ID |
| `status` | `VARCHAR` | Enum `QUEUED` \| `RUNNING` \| `DONE` \| `FAILED` \| `CANCELLED` |
| `attempts` | `INTEGER` | Default `0` |
| `max_attempts` | `INTEGER` | Default `2` |
| `locked_at` | `TIMESTAMPTZ` | Nullable |
| `locked_by` | `VARCHAR` | Worker identifier (nullable) |
| `heartbeat_at` | `TIMESTAMPTZ` | Last heartbeat timestamp |
| `last_error` | `TEXT` | Nullable |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |
| `updated_at` | `TIMESTAMPTZ` | |
| *Indexes* | | `INDEX(status, created_at)` |

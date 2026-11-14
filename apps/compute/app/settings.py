"""Compute service configuration using Pydantic Settings."""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for compute worker and API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/epilens",
        description="Direct PostgreSQL connection string",
    )
    COMPUTE_SHARED_SECRET: str = Field(
        default="epilens-local-internal-compute-secret",
        description="Shared secret for internal service communications",
    )
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated allowed origins for CORS",
    )
    CODE_REVISION: str = Field(
        default="v1.0.1-fk-fix",
        description="Git commit SHA or semantic build version",
    )
    WORKER_CONCURRENCY: int = Field(
        default=1,
        description="Maximum concurrent jobs per worker instance",
    )
    WORKER_PROCESSES: int = Field(
        default=1,
        description="Worker processes count",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parsed list of CORS origin strings."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()

"""FastAPI compute service entry point."""
from fastapi import FastAPI

app = FastAPI(title="EpiLens Compute API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, bool]:
    """Lightweight liveness check, touches no database."""
    return {"ok": True}

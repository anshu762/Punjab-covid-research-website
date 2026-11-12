"""Health check endpoint tests."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    """GET /health returns 200 and ok=True."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["status"] == "healthy"
    assert data["service"] == "epilens-compute"


def test_root() -> None:
    """GET / returns 200 and healthy status."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
